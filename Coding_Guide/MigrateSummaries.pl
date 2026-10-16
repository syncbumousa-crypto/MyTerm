use strict; use warnings;
# ============================================================
# نقلُ مهارات النسخة القديمة إلى شجرة Summaries.
# بايتاتٌ خامّ في الطرفين: العربيُّ يَمرّ ولا يُعاد ترميزُه.
# ولا يُخترع رقمٌ واحد — كلُّ ما يُكتب مقروءٌ من ملفٍّ على القرص.
# ============================================================
my ($SRC, $OUT) = @ARGV;
die "usage: migrate.pl <old-project> <out>\n" unless $SRC && $OUT;

sub slurp { my $f=shift; open my $h,'<:raw',$f or return undef; local $/; my $s=<$h>; close $h; $s }
sub spit  { my ($f,$s)=@_; my $d=$f; $d=~s{/[^/]+$}{}; mkdirs($d); open my $h,'>:raw',$f or die "$f: $!"; print $h $s; close $h }
sub mkdirs{ my $p=shift; my $lead = ($p =~ m{^/}) ? "/" : ""; my @a=grep { length } split m{/}, $p; my $c=$lead; for my $seg (@a){ $c .= ($c eq "/" ? "" : ($c?"/":"")).$seg; next if $c =~ m{^[A-Za-z]:$}; mkdir $c unless -d $c } }
sub jstr  { my $s=shift // ''; $s =~ s/\\/\\\\/g; $s =~ s/"/\\"/g; $s =~ s/\r//g; $s =~ s/\n/\\n/g; $s =~ s/\t/\\t/g; "\"$s\"" }

# ---------- 1) progress.js : pct وأجزاءُ كلِّ فصل ----------
my $prog = slurp("$SRC/لوحة المواد/data/progress.js") or die "no progress.js";
my (%P, $course);
for my $line (split /\n/, $prog) {
  $course = $1 if $line =~ /^\s*'([A-Z]+\d+)':\s*\{root:/;
  next unless $course;
  next unless $line =~ /^\s*'([^']+)':\s*\{built:(true|false)/;
  my ($ch, $built) = ($1, $2);
  my %r = (built => $built, pct => 0, parts => {}, counts => {});
  $r{pct} = $1 if $line =~ /pct:(\d+)/;
  if ($line =~ /parts:\{([^}]*)\}/)  { my $p=$1; while($p =~ /(\w+):([\d.]+)/g){ $r{parts}{$1}=$2+0 } }
  if ($line =~ /counts:\{([^}]*)\}/) { my $p=$1; while($p =~ /(\w+):([\d+]+)/g){ my ($k,$v)=($1,$2);
      my $n=0; $n+=$_ for split /\+/, $v; $r{counts}{$k}=$n } }
  for my $k (qw(terms questions laws bank)) { $r{$k} = $1 if $line =~ /\b$k:(\d+)/ }
  $P{$course}{$ch} = \%r;
}

# ---------- 2) الأجزاءُ غيرُ المُمكنة: صفرٌ في كلِّ فصول المادّة ----------
my %NATURE;
for my $c (keys %P) {
  my (%zero, %seen);
  for my $ch (keys %{$P{$c}}) {
    for my $k (keys %{$P{$c}{$ch}{parts}}) { $seen{$k}++; $zero{$k}++ if ($P{$c}{$ch}{parts}{$k} // 0) == 0 }
  }
  my @na = sort grep { $seen{$_} && $zero{$_} == $seen{$_} } keys %seen;
  $NATURE{$c}{unreachable} = \@na;
}
# الأوزان، مقروءةٌ من الملفّ نفسِه
my %W; if ($prog =~ /weights:\s*\{([^}]*)\}/) { my $w=$1; while($w =~ /(\w+):\s*(\d+)/g){ $W{$1}=$2 } }
for my $c (keys %NATURE) {
  my $lost = 0; $lost += ($W{$_} // 0) for @{$NATURE{$c}{unreachable}};
  $NATURE{$c}{cap} = 100 - $lost;
}

# ---------- 3) ملفّاتُ الصنعة الثلاثةَ عشر ----------
my $md = "$SRC/مشروع التلخيص الذكي";
opendir(my $dh, $md) or die $!;
my @method = sort grep { /^\d\d_.*\.md$/ } readdir $dh; closedir $dh;
my @mIdx;
for my $f (@method) {
  my $body = slurp("$md/$f");
  spit("$OUT/method/$f", $body);
  my ($title) = $body =~ /^#\s*(.+)$/m;
  push @mIdx, { file => $f, title => ($title // $f), bytes => length($body) };
}

# ---------- 4) لكلّ مادّة: الطبيعة، والفصول، والتسليمات ----------
my %ROOT = map { my $c=$_; ($c => "ملخصات $c") } keys %P;
my @courses;
for my $c (sort keys %P) {
  my $root = "$SRC/$ROOT{$c}";
  my $debt = slurp("$root/known_debt.json");
  my (@chs, @handovers);
  for my $ch (sort keys %{$P{$c}}) {
    my $r = $P{$c}{$ch};
    my $deliv = slurp("$root/$ch/_تسليم.md");
    my $expect = slurp("$root/$ch/_expected.json");
    # الحرّاس: ملفّات _v*.html في مجلّد الفصل
    my @g;
    if (opendir(my $d2, "$root/$ch")) { @g = sort grep { /^_v.*\.html$/ } readdir $d2; closedir $d2 }
    # التحذيرُ للفصل التالي: القسم السادس من التسليم
    my $warn = '';
    if ($deliv && $deliv =~ /##\s*٦\s*·\s*تحذيرٌ?\s*للفصل التالي\s*(.*?)(?=\n##\s|\z)/s) { $warn = $1; $warn =~ s/^\s+|\s+$//g }
    push @handovers, { ch => $ch, warn => $warn } if $warn ne '';

    my $parts = join(', ', map { "\"$_\": $r->{parts}{$_}" } sort keys %{$r->{parts}});
    my $counts= join(', ', map { "\"$_\": $r->{counts}{$_}" } sort keys %{$r->{counts}});
    my $json = "{\n"
      . "  \"course\": \"$c\",\n  \"chapter\": " . jstr($ch) . ",\n"
      . "  \"built\": $r->{built},\n  \"pct\": $r->{pct},\n"
      . "  \"cap\": $NATURE{$c}{cap},\n"
      . "  \"parts\": { $parts },\n"
      . "  \"counts\": { $counts },\n"
      . "  \"guards\": [" . join(', ', map { jstr($_) } @g) . "],\n"
      . "  \"delivery\": " . jstr($deliv // '') . ",\n"
      . "  \"expected\": " . jstr($expect // '') . ",\n"
      . "  \"handoverToNext\": " . jstr($warn) . "\n}\n";
    spit("$OUT/courses/$c/chapters/$ch.json", $json);
    push @chs, $ch;
  }

  # المهارةُ الحاليّة: سلسلةُ التحذيرات بترتيب الفصول — هي ما تَسلّمه الفصلُ الأخير
  my $skills = "# مهارةُ $c — مجموعةً من تسليمات فصولها\n\n"
    . "> مُولَّدٌ من النسخة القديمة في " . scalar(localtime) . ".\n"
    . "> كلُّ فقرةٍ هنا كتبها تسليمُ فصلٍ تحذيرًا لِما بعده.\n\n";
  $skills .= "## من $_->{ch}\n\n$_->{warn}\n\n" for @handovers;
  spit("$OUT/courses/$c/skills.md", $skills);
  spit("$OUT/courses/$c/skills/v01-migrated.md", $skills);

  my $nat = "{\n  \"course\": \"$c\",\n  \"root\": " . jstr($ROOT{$c}) . ",\n"
    . "  \"chapters\": [" . join(', ', map { jstr($_) } @chs) . "],\n"
    . "  \"unreachable\": [" . join(', ', map { jstr($_) } @{$NATURE{$c}{unreachable}}) . "],\n"
    . "  \"cap\": $NATURE{$c}{cap},\n"
    . "  \"weights\": { " . join(', ', map { "\"$_\": $W{$_}" } sort keys %W) . " },\n"
    . "  \"knownDebt\": " . jstr($debt // '') . "\n}\n";
  spit("$OUT/courses/$c/nature.json", $nat);
  push @courses, { code => $c, n => scalar(@chs), cap => $NATURE{$c}{cap} };
}

# ---------- 5) المدخل ----------
my $idx = "{\n  \"builtAt\": " . time() . ",\n"
  . "  \"source\": \"التلخيص الذكي — النسخة الكاملة على الجهاز\",\n"
  . "  \"readForAChapter\": [\n"
  . "    \"method/index.json ثمّ ما يَخصّ الخطوة\",\n"
  . "    \"courses/<CODE>/nature.json\",\n"
  . "    \"courses/<CODE>/skills.md\",\n"
  . "    \"courses/<CODE>/chapters/<الفصل السابق>.json → handoverToNext\"\n  ],\n"
  . "  \"courses\": [" . join(', ', map { "{\"code\": \"$_->{code}\", \"chapters\": $_->{n}, \"cap\": $_->{cap}}" } @courses) . "],\n"
  . "  \"method\": " . scalar(@method) . "\n}\n";
spit("$OUT/index.json", $idx);

my $mj = "{\n  \"files\": [\n" . join(",\n", map {
  "    {\"file\": " . jstr($_->{file}) . ", \"title\": " . jstr($_->{title}) . ", \"bytes\": $_->{bytes} }" } @mIdx) . "\n  ]\n}\n";
spit("$OUT/method/index.json", $mj);

my $tot = 0; $tot += $_->{n} for @courses;
print "الموادّ: " . scalar(@courses) . " · الفصول: $tot · ملفّات الصنعة: " . scalar(@method) . "\n";
print "  $_->{code}: $_->{n} فصلًا · سقف $_->{cap}%\n" for @courses;

# ---------- 6) فهرسٌ صغير: ما يَلزم المربَّعَ وحدَه ----------
# المربَّعُ يُرسم مع كلِّ فصل، فلا يَصحّ أن يُكلّف تسعةً وخمسين طلبًا.
# وهذا الملفُّ يَحمل الأرقامَ وحدَها؛ والنصُّ الطويل — التسليمُ والتحذير —
# يُجلَب حين تُفتح النافذة، لفصلٍ واحدٍ لا غير.
my @flat;
for my $c (sort keys %P) {
  for my $ch (sort keys %{$P{$c}}) {
    my $r = $P{$c}{$ch};
    my $parts = join(', ', map { "\"$_\": $r->{parts}{$_}" } sort keys %{$r->{parts}});
    push @flat, "    " . jstr("$c/$ch") . ": {\"course\": \"$c\", \"chapter\": " . jstr($ch) .
      ", \"pct\": $r->{pct}, \"cap\": $NATURE{$c}{cap}, \"built\": $r->{built}" .
      ", \"laws\": " . ($r->{laws} // 0) . ", \"parts\": { $parts } }";
  }
}
spit("$OUT/all.json", "{\n" . join(",\n", @flat) . "\n}\n");
print "وفهرسٌ صغير: all.json بـ" . scalar(@flat) . " مدخلًا\n";

use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
# ============================================================
# # 🛡️ 📘  NO EQUATION OF THE BOOK IS MISSING, AND NO BADGE LIES
# # 🔤 Perl
# # 🎯 `GuardLawFrom.html` measures the badge: that it survives the
# #    gate, stands above the equation, and carries one of four
# #    kinds. What it cannot measure is the only thing he actually
# #    asked for - that the chapter's laws cover the book. A guard
# #    in a browser has no book; this one reads it.
# # 🎯 Both directions, because a list has two faults:
# #    FORWARD  every number the book prints in `(6.N)` is named on
# #             some badge, or a law of his course is nowhere on his
# #             sheets and nothing says so;
# #    BACKWARD every number a badge names exists in the book, on
# #             the page the badge sends him to - so a mistyped
# #             number or page cannot sit there looking authoritative.
# # 🎯 And every law box carries exactly one badge of a known kind.
# # 🔗 Asked on 2026-10-31: `there are laws I cannot find in the book,
# #    and laws the book mentions that you did not put - why?` then
# #    `do not delete laws, put marks over each one showing its
# #    source, and make sure none is missing`.
# # 🔗 The page a badge cites is the PRINTED page. The word index is
# #    per chapter scan page, and printed = scan + the chapter's
# #    first printed page - 1, read off the scan itself and not typed.
# # ⚙ perl GuardLawFromBook.pl FIN250 Ch6
# ============================================================
my ($code, $ch) = @ARGV;
die "usage: perl GuardLawFromBook.pl <CODE> <ChN>\n" unless $code && $ch;

# ---- the chapter folder, derived from where this guard sits
my $here = $0; $here =~ s{[^/\\]+$}{}; $here =~ s{[\\]}{/}g; $here = './' unless length $here;
my $desk = $here . '../../';
my $dir  = $desk . "\x{0627}\x{0644}\x{062A}\x{0644}\x{062E}\x{064A}\x{0635} \x{0627}\x{0644}\x{0630}\x{0643}\x{064A}/"
         . "\x{0645}\x{0644}\x{062E}\x{0635}\x{0627}\x{062A} $code/$ch/";
# A THIRD ARGUMENT, SO THE GUARD CAN BE PROVED TO FAIL. A check that has
# only ever been run on the clean state is a claim, not a measurement -
# point it at a spoiled copy of the chapter and it must shout
$dir = $ARGV[2] . '/' if defined $ARGV[2] && length $ARGV[2];
my $rd = sub {
  my $p = $dir . $_[0]; utf8::encode($p);
  open(my $h, '<:encoding(UTF-8)', $p) or die "cannot read $_[0]: $!\n";
  local $/; my $s = <$h>; close $h; $s;
};
my $data = $rd->('ch6_data.js') if $ch eq 'Ch6';
$data = $rd->(lc($ch) . '_data.js') unless defined $data;
my $words = $rd->('book_words.js');

my (@faults, @out);
my $say = sub { my ($ok, $line) = @_; push @out, ($ok ? 'PASS ' : 'FAIL ') . $line; push @faults, $line unless $ok };

# ---- 1  WHAT THE BOOK PRINTS, page by page
my @pages = split /\][ \t\r\n]*,[ \t\r\n]*\[/, $words;
my @text;
for my $p (@pages) {
  my @w;
  while ($p =~ /[{]t:'([^']*)'/g) { push @w, $1 }
  push @text, join(' ', @w) if @w;
}
$say->(scalar(@text) > 10, 'the book of the chapter is read: ' . scalar(@text) . ' pages');

# The printed page number is a three-digit run on a page that also
# carries the running chapter line - read off the scan, never typed.
# And taken by AGREEMENT, not by the first hit: a page can carry a
# figure number that reads like a page number, so the offset that the
# most pages agree on is the one used
my %vote;
for my $i (0 .. $#text) {
  next unless $text[$i] =~ /Chapter/;
  my ($num) = $text[$i] =~ /\b(3\d\d)\b/;
  next unless $num;
  $vote{$num - $i - 1}++;
}
my ($first) = sort { $vote{$b} <=> $vote{$a} || $a <=> $b } keys %vote;
$first = 0 unless defined $first;
$say->($first > 0, 'and its first page is printed ' . ($first + 1) . ' (offset ' . $first . ')');

my %printed;
for my $i (0 .. $#text) {
  while ($text[$i] =~ /\((6\.\d+[a-z]?)\)/g) { $printed{$1} = $i + 1 + $first }
}
my @nums = sort keys %printed;
$say->(scalar(@nums) > 0, 'the equations it numbers: ' . join(' ', map { "$_/p$printed{$_}" } @nums));

# ---- 2  WHAT THE SHEETS SAY
my $a = index($data, 'const RULES_BLOCKS_1');
my $b = index($data, 'const RULES_BLOCKS_5');
die "the chapter has no rules stacks\n" if $a < 0 || $b < 0;
my $t = substr($data, $a, $b - $a);
my @boxes = split /(?=<div class="lawBox)/, $t; shift @boxes;
my %ok = map { $_ => 1 } qw(eq case text added);
my (%cited, %citedPage, %fromCh, @bare, @odd);
for my $box (@boxes) {
  my ($no) = $box =~ /lawNo">([\d.]+[a-z]?)</;
  $no = '?' unless defined $no;
  my @badge = $box =~ /<span class="lawFrom" data-kind="([a-z]*)">(.*?)<\/span><\/span>/gs;
  unless (@badge == 2) { push @bare, $no . '(' . (@badge / 2) . ')'; next }
  my ($kind, $body) = @badge;
  push @odd, "$no:$kind" unless $ok{$kind};
  my ($ar) = $body =~ /class="arOnly">(.*?)<\/span>/s;
  $ar = $body unless defined $ar;
  # HOLD THE CAPTURE BEFORE TESTING IT. `$cited{$1} = $no if $1 =~ ...`
  # runs the condition first, and that match resets $1 - so every number
  # was filed under undef and all nine equations read as missing
  # AND NOT WITH `\b`: in Arabic the second number is glued to a waw -
  # `6.5a و6.5` - and there is no word boundary between a letter and a
  # digit, so three equations that are plainly named read as missing
  while ($ar =~ /(?<![\d.])(\d\.\d+[a-z]?)(?![\d])/g) { my $n = $1; $cited{$n} = $no if $n =~ /^[56]\./ }
  while ($ar =~ /\x{0635}(\d\d\d)/g) { $citedPage{$no} = $1 }
  # A BADGE THAT SAYS "ANOTHER CHAPTER" AND NAMES NOTHING. `from chapter
  # 5` with no equation number was how the annuity factor sat here for
  # weeks: nothing to check, so nothing was checked
  my ($said) = $ar =~ /\x{0641}\x{0635}\x{0644}\s*(\d+)/;
  ($said) = $body =~ /Chapter\s*(\d+)/ unless defined $said;
  $fromCh{$no} = $said if defined $said;
  if ($kind eq 'eq') {
    for my $n ($ar =~ /\b(6\.\d+[a-z]?)\b/g) {
      my $pg = $citedPage{$no};
      $say->(defined $printed{$n}, "law $no names equation $n, and the book prints it");
      $say->(defined $pg && defined $printed{$n} && abs($printed{$n} - $pg) <= 1,
        "and sends him to the page it is on: badge p" . ($pg // '-') . ", book p" . ($printed{$n} // '-'));
    }
  }
}
$say->(!@bare, 'every law box carries one source line' . (@bare ? ': bare ' . join(' ', @bare) : ''));
$say->(!@odd, 'and a kind outside the four is on none' . (@odd ? ': ' . join(' ', @odd) : ''));

# ---- 3  FORWARD: the book's own numbers are all named
my @lost = grep { !$cited{$_} } @nums;
$say->(!@lost, 'no numbered equation of the book is missing from the sheets'
  . (@lost ? ': ' . join(' ', map { "$_ (p$printed{$_})" } @lost) : ''));

# ---- 4  BACKWARD: a badge of this chapter cannot name what is not there
my @ghost = grep { /^6\./ && !$printed{$_} } sort keys %cited;
$say->(!@ghost, 'and no badge names an equation the book does not print'
  . (@ghost ? ': ' . join(' ', map { "$_ on law $cited{$_}" } @ghost) : ''));

# ---- 5  a page a badge cites is a page the chapter has
my @far = grep { $citedPage{$_} < $first + 1 || $citedPage{$_} > $first + @text } sort keys %citedPage;
$say->(!@far, 'every page a badge cites is inside the chapter'
  . (@far ? ': ' . join(' ', map { "$_->p$citedPage{$_}" } @far) : ''));

# ---- 6  A LAW FROM ANOTHER CHAPTER ONLY IF THIS CHAPTER REACHES FOR IT
# He asked: why is a chapter 5 law on a chapter 6 sheet? For 5.7 there is
# an answer the book gives - its own example 6.6 says 6.4 reduces to 5.7.
# For the annuity factor there was none: I put it there to name a bracket.
# So the test is not "is it useful" but "does THIS chapter's text cite
# it", and the chapter's own words are the judge
# the chapter's own number, read off the numbers the book prints here and
# not off the folder name - `Ch6` is a folder, `6.5` is the book talking
my ($chNo) = (sort keys %printed)[0] =~ /^(\d+)\./;
die "cannot tell which chapter this is from the book\n" unless $chNo;
my @foreign = grep { !/^$chNo\./ } sort keys %cited;
my @unasked;
for my $n (@foreign) {
  my $asked = grep { /Equation\s+\Q$n\E\b/ } @text;
  push @unasked, "$n (law $cited{$n})" unless $asked;
}
$say->(!@unasked, 'every law borrowed from another chapter is one this chapter cites'
  . (@foreign ? ': borrowed ' . join(' ', @foreign) : ': none borrowed')
  . (@unasked ? ' - UNCITED: ' . join(' ', @unasked) : ''));

# and a badge may not claim another chapter WITHOUT naming the equation,
# which is unfalsifiable and was exactly how the annuity factor stayed
my @vague;
for my $law (sort keys %fromCh) {
  next if $fromCh{$law} == $chNo;
  my $names = grep { $cited{$_} eq $law } grep { /^$fromCh{$law}\./ } keys %cited;
  push @vague, "$law (says chapter $fromCh{$law})" unless $names;
}
$say->(!@vague, 'and none of them says "another chapter" without naming which equation'
  . (@vague ? ': ' . join(' ', @vague) : ''));

# ---- 7  AND NOTHING OF THE TOOL THAT BUILT IT IS LEFT ON THE PAGE
# A perl escape written inside single quotes is not an escape: `\x{00F7}`
# went into a sheet as five characters, reached his Drive, and read as
# that on the page - and in the data file a JS template literal refused
# to parse at all. A numeric entity is the quieter twin: the gate decodes
# `&#8722;` on the way in, so the copy on disk stops matching Drive and
# the mirror drifts for ever. (`&lt;` and `&gt;` are not that: they are
# how the calculator steps carry their own angle brackets.)
my $bs = chr(92);
my @esc = $t =~ /(\Q$bs\Ex\{[0-9A-Fa-f]+\})/g;
$say->(!@esc, 'no escape text of the builder reached a sheet'
  . (@esc ? ': ' . scalar(@esc) . ' of them, first ' . $esc[0] : ''));
my @ents = $t =~ /(&#\d+;)/g;
my %ents; $ents{$_}++ for @ents;
$say->(!@ents, 'and no numeric entity, which the gate would decode and the mirror then miss'
  . (@ents ? ': ' . join(' ', map { "$_ x$ents{$_}" } sort keys %ents) : ''));

printf "%s (%d checks)\n%s\n", (@faults ? 'FAIL ' . scalar(@faults) . ' fault(s)' : 'OK'),
  scalar(@out), join("\n", @out);
exit(@faults ? 1 : 0);

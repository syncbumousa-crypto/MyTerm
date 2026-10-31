use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
# ============================================================
# # 🔍 📘  WHAT A CHAPTER'S LAW SHEETS OWE ITS BOOK
# # 🔤 Perl
# # 🎯 Chapter 6 was corrected four times in one day, and every
# #    fault was something nobody had measured: a law with no source
# #    on it, an equation named but written in my spelling instead
# #    of the book's, two equations the book prints that the sheet
# #    only implied, a chapter 5 law with no reason to be there, an
# #    invented symbol, a stale seat in the source map, and perl
# #    escape text that reached his Drive. This reads a chapter and
# #    reports every one of them, so the next chapter is measured
# #    before he finds it.
# # 🎯 It REPORTS; it does not fix, and it does not pretend to judge
# #    what only an eye can judge. Pass and fail belong to the two
# #    guards (`GuardLawFrom.html`, `GuardLawFromBook.pl`); this is
# #    the wider sweep that says what a chapter needs first.
# # 🔗 A CITATION IS WHAT THE WORD BEFORE IT SAYS. `المعادلة 7.1` is
# #    an equation and `المثال 7.8` is an example, and the book
# #    numbers both - reading every `7.N` as an equation turned nine
# #    sound citations into faults on the first run, and every price
# #    in a note (`0.48`, `6.90`) into a borrowed law.
# # 🔗 Asked on 2026-10-31: `review chapter 7 and make sure it does
# #    not have the same problems; write a roadmap to help you`.
# # ⚙ perl AuditLawSheets.pl FIN250 Ch7   [<folder>]
# ============================================================
my ($code, $ch, $override) = @ARGV;
die "usage: perl AuditLawSheets.pl <CODE> <ChN> [<folder>]\n" unless $code && $ch;
my ($chNo) = $ch =~ /(\d+)/;
die "cannot read a chapter number out of '$ch'\n" unless $chNo;

my $here = $0; $here =~ s{[^/\\]+$}{}; $here =~ s{\\}{/}g; $here = './' unless length $here;
my $dir = (defined $override && length $override) ? $override . '/'
  : $here . '../../' . "\x{0627}\x{0644}\x{062A}\x{0644}\x{062E}\x{064A}\x{0635} \x{0627}\x{0644}\x{0630}\x{0643}\x{064A}/"
          . "\x{0645}\x{0644}\x{062E}\x{0635}\x{0627}\x{062A} $code/$ch/";
my $rd = sub {
  my $p = $dir . $_[0]; utf8::encode($p);
  open(my $h, '<:encoding(UTF-8)', $p) or return undef;
  local $/; my $s = <$h>; close $h; $s;
};
my $data  = $rd->(lc($ch) . '_data.js')   or die "no " . lc($ch) . "_data.js in $dir\n";
my $words = $rd->('book_words.js')        or die "no book_words.js in $dir\n";

my (@line, @todo, @note, @eye);
my $put  = sub { push @line, $_[0] };
my $owed = sub { push @todo, $_[0] };
my $fine = sub { push @note, $_[0] };
my $look = sub { push @eye,  $_[0] };

# ---- A  THE BOOK: ITS PAGES, ITS EQUATIONS, ITS EXAMPLES
my @pages = split /\][ \t\r\n]*,[ \t\r\n]*\[/, $words;
my @text;
for my $p (@pages) {
  my @w;
  while ($p =~ /[{]t:'([^']*)'/g) { push @w, $1 }
  push @text, join(' ', @w) if @w;
}
my %vote;
for my $i (0 .. $#text) {
  next unless $text[$i] =~ /Chapter/;
  my ($num) = $text[$i] =~ /\b([1-9]\d\d)\b/;
  next unless $num;
  $vote{$num - $i - 1}++;
}
my ($first) = sort { $vote{$b} <=> $vote{$a} || $a <=> $b } keys %vote;
$first = 0 unless defined $first;
my (%printed, %example);
for my $i (0 .. $#text) {
  # ONLY THIS CHAPTER'S OWN NUMBERS. A percentage in brackets - `(9.5)`,
  # `(24.8)` - reads exactly like an equation of another chapter, and two
  # of them were reported as missing laws on the first run. A borrowed
  # equation is found by the words `Equation 6.3`, never by brackets
  while ($text[$i] =~ /\(($chNo\.\d+[a-z]?)\)/g) { $printed{$1} = $i + 1 + $first }
  # THE SCAN SPACES OUT A HEADING: `E X AM P L E 7 . 8`. Read it loosely
  # or every example citation reads as a fabrication
  my $flat = $text[$i]; $flat =~ s/\s+/ /g;
  while ($flat =~ /E\s*X\s*A\s*M\s*P\s*L\s*E\s*(\d)\s*\.\s*(\d+(?:\s\d)?)/gi) {
    my ($c, $n) = ($1, $2); $n =~ s/\s//g;
    $example{"$c.$n"} = $i + 1 + $first;
  }
}
my $book = join ' ', @text;
my $bookFlat = $book; $bookFlat =~ s/\s+/ /g;
$put->(sprintf('BOOK    %d pages, printed %d-%d', scalar(@text), $first + 1, $first + @text));
$put->('        equations it numbers (' . scalar(keys %printed) . '): '
  . join(' ', map { "$_/p$printed{$_}" } sort keys %printed));
$put->('        examples it numbers (' . scalar(keys %example) . '): '
  . join(' ', map { "$_/p$example{$_}" } sort { $a <=> $b } keys %example));

# ---- B  THE LAW BOXES, AND WHAT EACH ONE CITES
my $a = index($data, 'const RULES_BLOCKS_1');
my $b = index($data, 'const RULES_GROUPS');
die "the chapter has no rules stacks\n" if $a < 0 || $b < 0;
my $t = substr($data, $a, $b - $a);
my @boxes = split /(?=<div class="lawBox)/, $t; shift @boxes;
# A NUMBER IS A CITATION ONLY IF THE WORD BEFORE IT SAYS SO
my $EQ = qr/(?:\x{0627}\x{0644}?\x{0645}\x{0639}\x{0627}\x{062F}\x{0644}\x{0629}|\x{0645}\x{0639}\x{0627}\x{062F}\x{0644}\x{062A}(?:\x{0627}|\x{0627}\x{0646}|\x{064A})|Equations?|Eq\.?)/;
my $EX = qr/(?:\x{0627}\x{0644}?\x{0645}\x{0650}?\x{062B}\x{0627}\x{0644}|\x{0623}\x{0645}\x{062B}\x{0644}\x{0629}|Examples?)/;
my (@no, %eqOf, %exOf, %kind, @bare, %sym, %eqText);
for my $box (@boxes) {
  my ($n) = $box =~ /lawNo">([\d.]+[a-z]?)</;
  next unless defined $n;
  push @no, $n;
  if ($box =~ /<span class="lawFrom" data-kind="([a-z]*)">(.*?)<\/span><\/span>/s) { $kind{$n} = $1 }
  else { push @bare, $n }
  # every citation in the whole box - badge and note alike
  my $words = $box;
  $words =~ s/<[^>]*>/ /g;
  # ONE WORD CAN CARRY TWO NUMBERS. `المعادلتان 6.2 و6.3` names both, and
  # reading only the first number after the word lost 6.3 on chapter 6 -
  # a real equation, reported as cited by nobody. So the run of numbers
  # after the word is taken whole, then split
  # ONE WORD CAN CARRY TWO NUMBERS - `المعادلتان 6.2 و6.3` names both, and
  # taking only the first lost 6.3 on chapter 6, a real equation reported
  # as cited by nobody. But a RUN is not everything that follows: a note
  # goes on `المثال 7.6: 489.07` and `وشبهها بـ3.1`, so a second number
  # counts only when nothing but a connector stands between them
  my $more = sub {
    my ($rest, $into) = @_;
    while ($rest =~ /\G([^\d]{0,6})(\d+\.\d+[a-z]?)/gc) {
      my ($gap, $num) = ($1, $2);
      last unless $gap =~ /^[\s\x{0648}\x{060C},\x{00B7}\x{2013}&-]*(?:and)?\s*$/;
      push @$into, $num;
    }
  };
  while ($words =~ /$EQ[^\d]{0,12}(\d+\.\d+[a-z]?)((?:[^\d]{0,6}\d+\.\d+[a-z]?)*)/g) {
    push @{ $eqOf{$n} }, $1;
    $more->($2, $eqOf{$n});
  }
  while ($words =~ /$EX[^\d]{0,12}(\d+\.\d+[a-z]?)((?:[^\d]{0,6}\d+\.\d+[a-z]?)*)/g) {
    push @{ $exOf{$n} }, $1;
    $more->($2, $exOf{$n});
  }
  my @eq = $box =~ /<div class="lawEq[^>]*>(.*?)<\/div>/gs;
  for my $one (@eq) {
    while ($one =~ /<span class="tt [^"]*">([^<]{1,8})</g) {
      my $s = $1; $s =~ s/^\s+|\s+$//g; next unless length $s;
      $sym{$s}{$n} = 1;
    }
  }
  my $flat = join ' | ', @eq;
  $flat =~ s/<small>.*?<\/small>//gs;
  $flat =~ s/<[^>]*>//gs; $flat =~ s/\s+/ /g;
  $eqText{$n} = $flat;
}
$put->(sprintf('SHEETS  %d law boxes: %s', scalar(@no), join(' ', @no)));

my %citedBy;
for my $n (@no) { for my $e (@{ $eqOf{$n} // [] }) { $citedBy{$e} = $n } }

# ---- C  A SOURCE LINE ON EVERY BOX
if (@bare == @no) { $owed->('no law carries a source line: the chapter needs the `lawFrom` pass (' . scalar(@no) . ' boxes)') }
elsif (@bare)     { $owed->(scalar(@bare) . ' laws with no source line: ' . join(' ', @bare)) }
else              { $fine->('every law carries a source line') }

# ---- D  FORWARD: nothing the book numbers goes unmentioned
my @lost = grep { !$citedBy{$_} } sort keys %printed;
if (@lost) { $owed->('equations the book numbers that no law cites: ' . join(' ', map { "$_(p$printed{$_})" } @lost)) }
else { $fine->('every equation the book numbers is cited by a law') }

# ---- E  BACKWARD: nothing cited that the book does not print
my (@ghostEq, @ghostEx);
for my $n (@no) {
  for my $e (@{ $eqOf{$n} // [] }) {
    push @ghostEq, "$e on law $n" if $e =~ /^$chNo\./ && !$printed{$e};
  }
  for my $e (@{ $exOf{$n} // [] }) {
    push @ghostEx, "$e on law $n" if $e =~ /^$chNo\./ && !$example{$e};
  }
}
if (@ghostEq) { $owed->('cited as an equation of this chapter but not printed in it: ' . join(' ', @ghostEq)) }
else { $fine->('no equation number is claimed that the book does not print') }
if (@ghostEx) { $owed->('cited as an example of this chapter but the chapter has no such example: ' . join(' ', @ghostEx)) }
else { $fine->('every example a note names is one the chapter numbers') }

# ---- F  BORROWED FROM ANOTHER CHAPTER
my (@borrow, @unasked);
for my $e (sort keys %citedBy) {
  next if $e =~ /^$chNo\./;
  push @borrow, "$e(law $citedBy{$e})";
  push @unasked, "$e(law $citedBy{$e})" unless $bookFlat =~ /Equation\s*\Q$e\E(?![\d])/;
}
if (@unasked) { $owed->('borrowed from another chapter and NOT cited by this one: ' . join(' ', @unasked)) }
elsif (@borrow) { $fine->('borrowed from another chapter, and this chapter cites it: ' . join(' ', @borrow)) }
else { $fine->('nothing is borrowed from another chapter') }

# ---- G  THE SOURCE MAP AGAINST THE SHEETS
my ($ms) = $data =~ /const LAW_SRC = \{(.*?)\};/s;
if (defined $ms) {
  my @seat = $ms =~ /'([\d.]+[a-z]?)'\s*:/g;
  my %seat = map { $_ => 1 } @seat;
  my %have = map { $_ => 1 } @no;
  my @noseat = grep { !$seat{$_} } @no;
  my @gone = grep { !$have{$_} } @seat;
  if (@noseat || @gone) {
    $owed->('the source map disagrees with the sheets'
      . (@noseat ? ' - no seat for: ' . join(' ', @noseat) : '')
      . (@gone ? ' - a seat for laws that are gone: ' . join(' ', @gone) : ''));
  } else { $fine->('the source map names exactly the laws on the sheets (' . scalar(@seat) . ')') }
} else { $owed->('the chapter has no LAW_SRC map') }

# ---- H  WHAT MUST NEVER REACH A PAGE
my $bs = chr(92);
my @esc = $t =~ /(\Q$bs\Ex\{[0-9A-Fa-f]+\})/g;
$owed->(scalar(@esc) . ' pieces of escape text on the sheets (first ' . ($esc[0] // '') . ')') if @esc;
my @ents = $t =~ /(&#\d+;)/g;
$owed->(scalar(@ents) . ' numeric entities on the sheets - the gate decodes them and the mirror drifts') if @ents;
$fine->('no escape text and no numeric entity') unless @esc || @ents;
my $marks = 0;
while ($t =~ /<small>([^<]*)<\/small>/g) { $marks++ if $1 =~ /[\x{064B}-\x{0652}\x{0670}]/ }
$owed->("$marks glosses carry diacritics - he asked for plain arabic") if $marks;

# ---- I  WHAT ONLY AN EYE CAN JUDGE
my @alien;
for my $s (sort keys %sym) {
  next if $s =~ /^[0-9(),.\x{00D7}\x{00F7}+\x{2212}\x{03A3}=\x{2248}\x{2192}-]+$/;
  my $bare = $s; $bare =~ s/[^A-Za-z0-9*]//g;
  next unless length $bare;
  next if $bookFlat =~ /(?<![A-Za-z])\Q$bare\E(?![A-Za-z])/;
  # THE SCAN BREAKS A SUBSCRIPT ONTO ITS OWN LINE: `V` then `S`, `r`
  # then `WACC`. So a symbol is also found if its head and its tail stand
  # apart - otherwise every subscripted symbol the book does use reads as
  # invented, which is what the first run said of VS, VC, VD and rWACC
  my ($head, $tail) = $bare =~ /^([A-Za-z])(.+)$/;
  next if $head && $tail && $bookFlat =~ /(?<![A-Za-z])\Q$head\E\s+\Q$tail\E(?![A-Za-z0-9])/i;
  my ($h2) = $bare =~ /^([A-Za-z]+)/;
  my ($t2) = $bare =~ /(\d+)$/;
  next if $h2 && $t2 && $bookFlat =~ /(?<![A-Za-z])\Q$h2\E\s*\Q$t2\E(?![0-9])/;
  push @alien, $s . '(' . join(',', sort keys %{ $sym{$s} }) . ')';
}
$look->('symbols that appear in no word of the chapter - each is either a name of mine or')
  if @alien;
$look->('a spelling the book does not use, and each needs an eye: ' . join(' ', @alien)) if @alien;
$look->('the equation of every law that cites a numbered one, to be read against its page:');
for my $n (@no) {
  my @mine = grep { /^$chNo\./ } @{ $eqOf{$n} // [] };
  next unless @mine;
  $look->(sprintf('  %-5s %-14s %s', $n,
    join(',', @mine) . ' p' . ($printed{$mine[0]} // '?'), $eqText{$n}));
}

print join("\n", @line), "\n\n";
printf "OWED %d\n", scalar(@todo);
print "  - $_\n" for @todo;
printf "\nTO READ BY EYE\n";
print "  $_\n" for @eye;
printf "\nFINE %d\n", scalar(@note);
print "  - $_\n" for @note;
exit(@todo ? 1 : 0);

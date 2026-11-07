param([string]$Name = 'Zion Pu')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$font = [System.Drawing.FontFamily]::new('Monotype Corsiva')
$outline = [System.Drawing.Drawing2D.GraphicsPath]::new()
$outline.AddString($Name, $font, 0, 170, [System.Drawing.PointF]::new(0,0), [System.Drawing.StringFormat]::GenericTypographic)
$bounds = $outline.GetBounds()
$scale = 505 / $bounds.Width
$tx = 480 - ($bounds.X + $bounds.Width / 2) * $scale
$ty = 155 - ($bounds.Y + $bounds.Height / 2) * $scale
$points = $outline.PathPoints
$types = $outline.PathTypes
$svgPath = [System.Text.StringBuilder]::new()
$inv = [System.Globalization.CultureInfo]::InvariantCulture
function Number([double]$n) { $n.ToString('0.###', $inv) }
for ($i=0; $i -lt $points.Length; $i++) {
  $kind = $types[$i] -band 7
  $pt = $points[$i]
  if ($kind -eq 0) { [void]$svgPath.Append("M$(Number $pt.X),$(Number $pt.Y) ") }
  elseif ($kind -eq 1) { [void]$svgPath.Append("L$(Number $pt.X),$(Number $pt.Y) ") }
  elseif ($kind -eq 3) {
    $p2 = $points[$i+1]; $p3 = $points[$i+2]
    [void]$svgPath.Append("C$(Number $pt.X),$(Number $pt.Y) $(Number $p2.X),$(Number $p2.Y) $(Number $p3.X),$(Number $p3.Y) ")
    $i += 2
  }
  if (($types[$i] -band 128) -ne 0) { [void]$svgPath.Append('Z ') }
}
$transform = "translate($(Number $tx) $(Number $ty)) scale($(Number $scale))"
$safeName = [System.Security.SecurityElement]::Escape($Name)
$svg = @"
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="340" viewBox="0 0 960 340" role="img" aria-labelledby="title desc">
<title id="title">$safeName — Built with care.</title>
<desc id="desc">An Italian calligraphic signature in pearl, lavender and ice blue. Quiet light trails connect code with care.</desc>
<defs>
  <linearGradient id="base" x2="1" y2="1"><stop stop-color="#0B101B"/><stop offset=".55" stop-color="#131728"/><stop offset="1" stop-color="#0D1620"/></linearGradient>
  <radialGradient id="glow"><stop stop-color="#8B6CE8" stop-opacity=".23"/><stop offset="1" stop-color="#8B6CE8" stop-opacity="0"/></radialGradient>
  <radialGradient id="teal"><stop stop-color="#67E8F9" stop-opacity=".12"/><stop offset="1" stop-color="#67E8F9" stop-opacity="0"/></radialGradient>
  <linearGradient id="ink" x1="0" y1="0" x2="1" y2=".4"><stop stop-color="#D8CCFF"/><stop offset=".45" stop-color="#FFFFFF"/><stop offset=".75" stop-color="#D5DEFF"/><stop offset="1" stop-color="#99E7EE"/></linearGradient>
  <linearGradient id="trail"><stop stop-color="#A78BFA" stop-opacity="0"/><stop offset=".45" stop-color="#A78BFA" stop-opacity=".8"/><stop offset=".8" stop-color="#7EDFE4" stop-opacity=".7"/><stop offset="1" stop-color="#7EDFE4" stop-opacity="0"/></linearGradient>
  <clipPath id="clip"><rect width="960" height="340" rx="24"/></clipPath>
</defs>
<style>
  text{font-family:'Segoe UI',Arial,sans-serif}
  .glow{animation:breathe 8s ease-in-out infinite}
  .light{stroke-dasharray:60 1100;animation:travel 13s linear infinite}
  .spark{animation:twinkle 6s ease-in-out infinite}
  @keyframes breathe{0%,100%{opacity:.65}50%{opacity:1}}
  @keyframes travel{to{stroke-dashoffset:-1160}}
  @keyframes twinkle{0%,100%{opacity:.35}50%{opacity:.9}}
  @media(prefers-reduced-motion:reduce){.glow,.light,.spark{animation:none}}
</style>
<g clip-path="url(#clip)">
  <rect width="960" height="340" rx="24" fill="url(#base)"/>
  <ellipse class="glow" cx="420" cy="130" rx="370" ry="240" fill="url(#glow)"/>
  <ellipse cx="790" cy="260" rx="280" ry="210" fill="url(#teal)"/>
  <path d="M-100 285 C140 110 195 335 485 240 S800 45 1070 135" fill="none" stroke="url(#trail)" stroke-width="1" opacity=".35"/>
  <path class="light" d="M-100 285 C140 110 195 335 485 240 S800 45 1070 135" fill="none" stroke="url(#trail)" stroke-width="1.7"/>
  <path d="M-90 295 C170 150 200 350 515 253 S840 75 1070 150" fill="none" stroke="url(#trail)" stroke-width=".6" opacity=".25"/>
  <g fill="#D5D0ED" class="spark">
    <circle cx="164" cy="123" r="1.5"/><circle cx="783" cy="89" r="1.4"/><circle cx="846" cy="225" r="1.7"/>
    <path d="M780 84v10m-5-5h10" stroke="#BAADF2" stroke-width=".65"/>
  </g>
  <text x="36" y="40" fill="#B2AEC6" font-size="11" letter-spacing="3">PU—007</text>
  <text x="924" y="40" text-anchor="end" fill="#8E9CB3" font-size="10" letter-spacing="2">IDEAS INTO EVERYDAY LIFE</text>
  <path transform="$transform" d="$svgPath" fill="url(#ink)"/>
  <text x="480" y="246" text-anchor="middle" fill="#C0C6D9" font-size="19" letter-spacing="3">Built with care.</text>
  <path d="M425 273h110" stroke="url(#trail)" stroke-width="1"/>
  <text x="480" y="310" text-anchor="middle" fill="#8A99B1" font-size="10" letter-spacing="3">WEB · APPS · SYSTEMS · AI</text>
</g>
</svg>
"@
$assetDir = Join-Path $PSScriptRoot '../assets'
[System.IO.File]::WriteAllText((Join-Path $assetDir 'hero.svg'), $svg, [System.Text.UTF8Encoding]::new($false))
$outline.Dispose(); $font.Dispose()
Write-Output 'Generated assets/hero.svg with outlined Monotype Corsiva lettering.'

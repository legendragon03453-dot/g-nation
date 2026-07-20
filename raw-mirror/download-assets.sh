#!/bin/bash
set -e
BASE="https://framerusercontent.com/images"
OUT="/c/Users/Nicácio/Desktop/g-nation-framer/public/assets"

declare -A FILES=(
  ["products/anel-cruz-royal.png"]="AOypJyrblE9t3lh8BHczApBukgU.png"
  ["products/anel-cruz-ice.png"]="FQLBl4WsCMPmlokGLwvKLP2QI.png"
  ["products/cubana-cravejada.png"]="eZ1LfJcT1mjXuJ3hqiGwQ04lqeU.png"
  ["products/trevo-royal.png"]="bCGgLp1tqNxcGLukCo3aRcOLqc.png"
  ["products/tennis-ice.png"]="9pXgwJ3hen4azYe26UbiDP9vXMM.png"
  ["products/elo-grumet.png"]="7NWdgyUGRzEej5uNk3tawRLLQyk.png"

  ["hero/wordmark.png"]="17xUsUjiIu09zrHhOYMyqeXeT4.png"
  ["hero/slice-left-1.png"]="xIX9RRg72ZRUdC1s47WmQTEuc.png"
  ["hero/slice-left-2.jpg"]="v3U36ngzQxUMZ7s0dC6rl2vvg.jpg"
  ["hero/slice-left-3.jpg"]="aFxcOBfv1mcfsdnvqxstgJHHhg.jpg"
  ["hero/slice-right-1.png"]="9v20n2qviQuqgrQFlp8NcIDxGzk.png"
  ["hero/slice-right-2.jpg"]="uXHPaNncJ2kbIZKNQlJuk3k4bk.jpg"
  ["hero/slice-right-3.jpg"]="w0hVp0KTzeaKD4kfAmLGb3uhGoo.jpg"

  ["nav/nav-strip.png"]="l545hrbC9p2EEGNGjkfgvRft6MM.png"
  ["nav/logo.png"]="mdoROem6KNlvzqxfg2uPMqM.png"
  ["nav/og-image.png"]="QIcpkcTNMDe807kGXNEdWAQPZ2g.png"

  ["mosaic/tile-1.png"]="5k2mq6ET4O8MT0Ak2hnpmiEEXRw.png"
  ["mosaic/tile-2.png"]="qXZyEiefaKH4KtH2dnKSlEyjrk.png"
  ["mosaic/tile-4.png"]="cv9wnSZdBUmd2egO7GCIZLwK5AY.png"
  ["mosaic/tile-5.png"]="QcugNaTs5GspSJC7NjBq694ww.png"
  ["mosaic/tile-7.png"]="29dScpcu8CyZ9EsISECJOhD2Tw.png"
  ["mosaic/tile-9.png"]="xcLywrukJdPJhdxE2y6Rb2HLlc.png"
  ["mosaic/tile-12.png"]="ysiklwy2l5DXJRageLdW96AvOEk.png"

  ["sections/image-1.jpg"]="dmwEoU3oooxKTK7tOEKBcpPKZG8.jpg"
  ["sections/image-2.png"]="9bucHmtmzMVJdc5SvzdJdvVuwFs.png"
  ["sections/image-3.png"]="71aaXIxswym8uJpmZCJ57MhnJQ.png"
  ["sections/image-4.png"]="7CzaGSENL4cCVlSDhEn46FeCvM.png"
  ["sections/image-5.jpg"]="xkNfdl79On9cs3qDMnRyR3OenLc.jpg"
  ["sections/image-6.jpg"]="k4RxVYIHK1RN3yuvvrCpAvLOpk.jpg"
  ["sections/border.png"]="MOCdahBOjh2RyZ6tRISaxiIu7c.png"
)

for dest in "${!FILES[@]}"; do
  src="${FILES[$dest]}"
  mkdir -p "$OUT/$(dirname "$dest")"
  curl -sL "$BASE/$src" -o "$OUT/$dest"
  size=$(stat -c%s "$OUT/$dest" 2>/dev/null || echo 0)
  echo "$dest <- $src ($size bytes)"
done

# SVG arrows (separate host path, keep query stripped)
curl -sL "https://framerusercontent.com/images/6tTbkXggWgQCAJ4DO2QEdXXmgM.svg" -o "$OUT/sections/arrow-left.svg"
curl -sL "https://framerusercontent.com/images/11KSGbIZoRSg4pjdnUoif6MKHI.svg" -o "$OUT/sections/arrow-right.svg"
echo "arrows done"

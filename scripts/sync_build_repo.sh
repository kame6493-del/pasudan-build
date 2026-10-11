#!/usr/bin/env bash
# 正本(private の pasudan)の HEAD を、公開のビルド用リポジトリ kame6493-del/pasudan-build へ写す。版を出すたびに流す。
#   bash scripts/sync_build_repo.sh            → 写して commit・push(iOS のビルドは別に gh workflow run)
#   bash scripts/sync_build_repo.sh --no-push  → 写して commit まで
# - mp3(public/sfx・public/bgm)は持ち込まない。まとめて AES-256-CBC(pbkdf2)で暗号化した assets/audio.enc だけを置く
#   (公開すると素材の再配布になるため。ワークフローの最初でシークレット AUDIO_KEY で復号する)
# - 合言葉は %LOCALAPPDATA%\PasudanBuild\audio-key.dpapi(DPAPI、この Windows ユーザーだけが復号できる)。表示しない
# - 写し先の作業フォルダは %LOCALAPPDATA%\PasudanBuild\build-repo。履歴は正本と別(mp3 の入った履歴を持ち込まない)
# - 正本はコミット済みの物だけを写す(git archive HEAD)。手元の未コミットの変更は入らない
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$(cygpath -u "$LOCALAPPDATA")/PasudanBuild"
OUT="$BASE/build-repo"
REMOTE="https://github.com/kame6493-del/pasudan-build.git"
KEYFILE="$(cygpath -w "$BASE/audio-key.dpapi")"

AUDIO_KEY="$(powershell -NoProfile -Command "\$s = Get-Content '$KEYFILE' | ConvertTo-SecureString; [Console]::Out.Write([System.Net.NetworkCredential]::new('', \$s).Password)")"
[ -n "$AUDIO_KEY" ] || { echo "合言葉を読めません: $KEYFILE"; exit 1; }
export AUDIO_KEY

SHA="$(git -C "$SRC" rev-parse --short HEAD)"
mkdir -p "$OUT"
if [ ! -d "$OUT/.git" ]; then
  git -C "$OUT" init -q -b main
  git -C "$OUT" remote add origin "$REMOTE"
fi
# 作者は正本と同じにする
git -C "$OUT" config user.name "$(git -C "$SRC" config user.name)"
git -C "$OUT" config user.email "$(git -C "$SRC" config user.email)"
# .git 以外を消して、HEAD をそのまま展開する
find "$OUT" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
git -C "$SRC" archive HEAD | tar -xf - -C "$OUT"
rm -rf "$OUT/public/sfx" "$OUT/public/bgm"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git -C "$SRC" archive HEAD public/sfx public/bgm | tar -xf - -C "$TMP"
mkdir -p "$OUT/assets"
tar -cf - -C "$TMP/public" sfx bgm | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 600000 -md sha256 -pass env:AUDIO_KEY -out "$OUT/assets/audio.enc"
# 戻せるかを確かめる
n=$(openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -pass env:AUDIO_KEY -in "$OUT/assets/audio.enc" | tar -tf - | grep -c '\.mp3$')
want=$(git -C "$SRC" ls-files public/sfx public/bgm | grep -c '\.mp3$')
[ "$n" = "$want" ] || { echo "暗号化した音の数が合いません $n/$want"; exit 1; }
printf '\n# 音は assets/audio.enc だけ(sync_build_repo.sh)\npublic/sfx/\npublic/bgm/\n' >> "$OUT/.gitignore"

git -C "$OUT" add -A
if git -C "$OUT" ls-files | grep -qiE '\.(mp3|wav|ogg|m4a)$'; then echo "音声ファイルが混ざっています。止めます"; exit 1; fi
if git -C "$OUT" diff --cached --quiet; then echo "変更なし ($SHA)"; else
  git -C "$OUT" commit -q -m "pasudan $SHA を写す(音は暗号化)"
  echo "commit: $(git -C "$OUT" log --oneline -1)"
fi
if [ "${1:-}" != "--no-push" ]; then
  git -C "$OUT" push -q origin main
  echo "push 済み: $REMOTE"
fi

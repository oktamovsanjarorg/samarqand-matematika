#!/usr/bin/env bash
# main'ga push qilingan commit PR'da allaqachon tekshirilganmi (T-149)?
# Squash merge'dan oldin branch origin/main ustiga rebase qilinadi, shuning uchun main'dagi commit'ning
# fayllar daraxti (tree) PR'ning oxirgi commit'i bilan bir xil bo'ladi. Shu daraxt uchun PR'da CI muvaffaqiyatli
# o'tgan bo'lsa, lint/test/e2e takrorlanmaydi (GitHub Actions daqiqalari tejaladi).
# Chiqish: stdout'ga "skip=true" yoki "skip=false". Har qanday xato yoki shubha: skip=false (to'liq tekshiruv).
# Ishlatish: REPO=owner/name SHA=<commit> [WORKFLOW=ci.yml] scripts/ci-verified.sh
set -uo pipefail

REPO="${REPO:?}"
SHA="${SHA:?}"
WORKFLOW="${WORKFLOW:-ci.yml}"

no() { echo "skip=false"; echo "to'liq tekshiruv: $1" >&2; exit 0; }

tree="$(gh api "repos/$REPO/git/commits/$SHA" -q .tree.sha 2> /dev/null)" || no "commit topilmadi"
pr="$(gh api "repos/$REPO/commits/$SHA/pulls" -q '.[0].number // empty' 2> /dev/null)" || no "PR so'rovi xato"
[[ -n "$pr" ]] || no "commit PR'dan emas"

# PR'ning oxirgi commit'i: merge qilingan kod shu. Daraxti main'dagi bilan bir xil bo'lishi shart
head="$(gh api "repos/$REPO/pulls/$pr" -q .head.sha 2> /dev/null)" || no "PR #$pr o'qilmadi"
head_tree="$(gh api "repos/$REPO/git/commits/$head" -q .tree.sha 2> /dev/null)" || no "PR commit'i topilmadi"
[[ "$head_tree" == "$tree" ]] || no "PR #$pr dagi kod main'dagidan farq qiladi (rebase'siz merge)"

# Aynan shu commit uchun PR'da CI muvaffaqiyatli o'tganmi (merge run'larida pull_requests bo'sh bo'ladi, shuning uchun head_sha bo'yicha)
ok="$(gh api "repos/$REPO/actions/workflows/$WORKFLOW/runs?event=pull_request&head_sha=$head&status=success&per_page=1" \
  -q '.total_count' 2> /dev/null)" || no "CI tarixi o'qilmadi"
[[ "${ok:-0}" -gt 0 ]] || no "PR #$pr ning oxirgi commit'ida muvaffaqiyatli CI yo'q"

echo "skip=true"
echo "PR #$pr da aynan shu kod ($head) tekshirilgan" >&2

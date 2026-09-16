#!/usr/bin/env python3
"""Bracket-matching audit for bare data interpolations in Telegram Markdown messages.

Rules implemented (from telegram-markdown-entity-parsing.md):
- Walk each ctx.reply / editMessageText / sendMessage / telegram.sendMessage call
  to its matching close paren; read that call's own parse_mode.
- Flag interpolations in Markdown messages that are NOT:
  * preceded by `*` (bold wrap neutralises unpaired `_`)
  * preceded by a backtick (code span)
  * inside a [label](url) link (escaping would corrupt the URL)
  * already wrapped in escapeMd(...) / escapeHtml(...) / renderQuestionText(...)
"""
import re
import sys
import glob

CALL_RE = re.compile(
    r'(?:ctx|telegram)\.(?:reply|editMessageText|sendMessage)\s*\(')
# interpolation not preceded by * or ` ; skip already-escaped calls
INTERP_RE = re.compile(r'(?<![\*`])\$\{\s*([a-zA-Z_][\w.]*)')
ESCAPED_TOKENS = ('escapeMd', 'escapeHtml', 'renderQuestionText')

# URLs in markdown links: [text](url) — find spans
LINK_RE = re.compile(r'\[[^\]]*\]\([^)]*$')  # open link at end of segment


def matching_paren(src, start):
    depth = 0
    i = start
    while i < len(src):
        c = src[i]
        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def in_link_prefix(text_before_interp):
    """Is the interpolation sitting inside a [label](  ... that hasn't closed?"""
    # find last unclosed ( preceded by ]( pattern
    idx = text_before_interp.rfind('](')
    if idx == -1:
        return False
    rest = text_before_interp[idx + 2:]
    if ')' in rest:
        return False
    return True


def audit_file(path):
    src = open(path, encoding='utf-8').read()
    findings = []
    for m in CALL_RE.finditer(src):
        start = m.end() - 1
        end = matching_paren(src, start)
        if end == -1:
            continue
        call = src[start:end + 1]
        if 'parse_mode: "Markdown"' not in call:
            continue
        line = src[:start].count('\n') + 1
        for mm in INTERP_RE.finditer(call):
            token = mm.group(1)
            before = call[max(0, mm.start() - 12):mm.start()]
            if any(t in before for t in ESCAPED_TOKENS):
                continue
            if in_link_prefix(call[:mm.start()]):
                kind = 'IN-LINK'
            else:
                kind = 'BARE'
            findings.append((line, kind, token, call[mm.start()-20:mm.end()+40].replace('\n', ' ')))
    return findings


def main():
    patterns = sys.argv[1:] or ['src/bot/**/*.ts', 'src/services/**/*.ts',
                                'src/app/api/**/*.ts']
    total = 0
    for pat in patterns:
        for path in sorted(glob.glob(pat, recursive=True)):
            for line, kind, token, ctx in audit_file(path):
                total += 1
                print(f'{path}:{line} [{kind}] ${{{token}}}')
                print(f'    …{ctx}…')
    print(f'\nTOTAL: {total}')
    return total


if __name__ == '__main__':
    main()

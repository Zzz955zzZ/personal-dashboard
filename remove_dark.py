import re, sys

path = 'dashboard.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

before = html.count('dark:')

# Remove whole Tailwind dark: variant tokens (including nested like dark:hover:, dark:focus:).
# Token stops at whitespace, quote, or tag char so we never eat into JS strings/'dark' literals.
html = re.sub(r'dark:[^\s"\'<>]+', '', html)

# Collapse/normalize whitespace inside static class="..." attributes (leave :class JS alone)
def fix_class(m):
    inner = m.group(1)
    inner = re.sub(r'\s+', ' ', inner).strip()
    return 'class="%s"' % inner
html = re.sub(r'class="([^"]*)"', fix_class, html)

after = html.count('dark:')

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print('dark: tokens before:', before)
print('dark: tokens after :', after)
print('removed:', before - after)
sys.exit(0 if after == 0 else 1)

"""out/*.json(書き起こし)→ app/src/data/questions.json。図が要る問題(exclude)は入れない。"""
import json, glob, os, sys
sys.stdout.reconfigure(encoding='utf-8')
KANA = 'アイウエ'
YEAR = {'2026r08': ('r08', '令和8年度'), '2025r07': ('r07', '令和7年度'), '2024r06': ('r06', '令和6年度')}
out = []
for f in sorted(glob.glob('out/*.json'), reverse=True):
    y = os.path.basename(f)[:7]
    for q in sorted(json.load(open(f, encoding='utf-8')), key=lambda q: q['no']):
        if q.get('exclude'):
            continue
        assert len(q['choices']) == 4, (y, q['no'])
        o = {'id': f"{YEAR[y][0]}-{q['no']:03d}", 'year': YEAR[y][1], 'no': q['no'], 'field': q['field'], 'topic': q['topic'],
             'q': q['q'], 'choices': q['choices'], 'answer': KANA.index(q['answer']), 'explain': q['explain'], 'terms': q.get('terms', [])}
        if q.get('table'): o['table'] = q['table']
        if q.get('code'): o['code'] = q['code']
        out.append(o)
out.sort(key=lambda o: o['id'], reverse=False)
json.dump(out, open('../app/src/data/questions.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(out), 'questions')

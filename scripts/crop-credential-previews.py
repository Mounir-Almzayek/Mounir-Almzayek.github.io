from pathlib import Path
from PIL import Image
import json
root=Path('assets/credentials')
report=json.loads((root/'report.json').read_text())
# All six original screenshots were individually inspected. They use the same
# Coursera page geometry: the complete paper occupies exactly this rectangle.
for item in report['credentials']:
    if item['status']!='original':
        continue
    path=root/(item['id']+'-certificate.png')
    with Image.open(path) as im:
        if im.size == (824,432):
            cropped=im.crop((133,0,690,430))
            cropped.save(path)
        elif im.size != (557,430):
            raise ValueError(f"Unreviewed certificate bounds: {path} {im.size}")
    item['preview_size']=[557,430]
    item['crop']='Paper only; original issuer content unchanged'
(root/'report.json').write_text(json.dumps(report,indent=2)+'\n')

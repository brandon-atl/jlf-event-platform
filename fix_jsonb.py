import os
import glob
import re

models_dir = "src/backend/app/models"
for filepath in glob.glob(f"{models_dir}/*.py"):
    if filepath.endswith("base.py"):
        continue
    with open(filepath, "r") as f:
        content = f.read()
    
    if "JSONB" in content:
        # Replace imports
        content = re.sub(r"from sqlalchemy\.dialects\.postgresql import.*JSONB.*\n", "", content)
        
        # Ensure JSONType is imported from base
        if "JSONType" not in content:
            if "from app.models.base import" in content:
                content = content.replace("from app.models.base import ", "from app.models.base import JSONType, ")
            else:
                content = "from app.models.base import JSONType\n" + content
                
        # Replace usages
        content = content.replace("JSONB", "JSONType")
        
        with open(filepath, "w") as f:
            f.write(content)

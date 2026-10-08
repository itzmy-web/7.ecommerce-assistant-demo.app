import subprocess, os

WEB = r"C:\Users\zmy\Desktop\ai电商运营助手\代码\ecommerce-operation-assistant\web"
os.chdir(WEB)

log = []
log.append("node_modules/lucide-react exists BEFORE: " +
           str(os.path.exists(os.path.join(WEB, "node_modules", "lucide-react"))))
log.append("package-lock.json exists: " +
           str(os.path.exists(os.path.join(WEB, "package-lock.json"))))

try:
    r = subprocess.run(
        ["npm.cmd", "install"],
        capture_output=True, text=True, timeout=420,
        encoding="utf-8", errors="ignore", shell=True,
    )
    log.append("returncode=" + str(r.returncode))
    log.append("STDOUT:\n" + (r.stdout or "(empty)")[-4000:])
    log.append("STDERR:\n" + (r.stderr or "(empty)")[-4000:])
except Exception as e:
    log.append("EXC: " + repr(e))

log.append("node_modules/lucide-react exists AFTER: " +
           str(os.path.exists(os.path.join(WEB, "node_modules", "lucide-react"))))

with open(os.path.join(WEB, "npmfix.log"), "w", encoding="utf-8") as f:
    f.write("\n".join(log))

import subprocess, os

WEB = r"C:\Users\zmy\Desktop\ai电商运营助手\代码\ecommerce-operation-assistant\web"
LOG = os.path.join(WEB, "npmfix.log")

def w(s):
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(s + "\n")
    print(s)  # 同时打印，便于排查

w("START pid ok")
try:
    os.chdir(WEB)
    w("chdir ok")
except Exception as e:
    w("chdir EXC: " + repr(e))
    raise

w("lucide BEFORE: " + str(os.path.exists(os.path.join(WEB, "node_modules", "lucide-react"))))

try:
    r = subprocess.run(
        ["npm.cmd", "install"],
        capture_output=True, text=True, timeout=400,
        encoding="utf-8", errors="ignore", shell=True,
    )
    w("returncode=" + str(r.returncode))
    w("STDOUT:\n" + (r.stdout or "(empty)")[-4000:])
    w("STDERR:\n" + (r.stderr or "(empty)")[-4000:])
except Exception as e:
    w("RUN EXC: " + repr(e))

w("lucide AFTER: " + str(os.path.exists(os.path.join(WEB, "node_modules", "lucide-react"))))
w("DONE")

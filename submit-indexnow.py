#!/usr/bin/env python3
"""Submit URLs from sitemap.xml to IndexNow (Bing, Yandex, etc.)."""

import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITEMAP_FILE = ROOT / "sitemap.xml"
HOST = "vaelo.club"


def find_env_key() -> str | None:
    if key := os.environ.get("INDEXNOW_API_KEY"):
        return key.strip()

    candidate_paths = [
        ROOT / ".env.local",
        ROOT.parent / "vaelo" / ".env.local",
        ROOT / ".env",
    ]
    for path in candidate_paths:
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("INDEXNOW_API_KEY="):
                    val = line.split("=", 1)[1].strip().strip("'\"")
                    if val:
                        return val
    return None


def get_key() -> tuple[str, Path]:
    env_key = find_env_key()

    # Procura arquivo <key>.txt existente no diretório
    for txt in ROOT.glob("*.txt"):
        name = txt.stem
        if re.fullmatch(r"[0-9a-fA-F]{16,64}", name):
            content = txt.read_text(encoding="utf-8").strip()
            if content == name:
                if env_key and env_key != content:
                    print(f"Aviso: INDEXNOW_API_KEY no env ({env_key}) difere de {txt.name}")
                return content, txt

    if env_key:
        txt_path = ROOT / f"{env_key}.txt"
        if not txt_path.exists():
            txt_path.write_text(f"{env_key}\n", encoding="utf-8")
            print(f"Criado arquivo de chave {txt_path.name}")
        return env_key, txt_path

    sys.exit("Nenhuma chave IndexNow encontrada (nem no .env.local nem como <key>.txt)")


def get_urls() -> list[str]:
    if not SITEMAP_FILE.exists():
        sys.exit(f"Sitemap não encontrado em {SITEMAP_FILE}")
    content = SITEMAP_FILE.read_text(encoding="utf-8")
    urls = re.findall(r"<loc>(https://[^<]+)</loc>", content)
    if not urls:
        sys.exit("Nenhuma URL encontrada no sitemap.xml")
    return urls


def submit(key: str, key_filename: str, urls: list[str], endpoint: str) -> int:
    payload = {
        "host": HOST,
        "key": key,
        "keyLocation": f"https://{HOST}/{key_filename}",
        "urlList": urls,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as resp:
            code = resp.status
            print(f"[{endpoint}] Sucesso (HTTP {code})")
            return code
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"[{endpoint}] Erro HTTP {e.code}: {body}")
        return e.code
    except Exception as e:
        print(f"[{endpoint}] Erro de conexão: {e}")
        return 1


def main() -> None:
    key, key_file = get_key()
    urls = get_urls()
    print(f"Host: {HOST}")
    print(f"Key: {key}")
    print(f"Key Location: https://{HOST}/{key_file.name}")
    print(f"URLs ({len(urls)}):")
    for u in urls:
        print(f"  - {u}")
    print()

    # Submete tanto no hub central do IndexNow quanto direto no Bing
    res1 = submit(key, key_file.name, urls, "https://api.indexnow.org/indexnow")
    res2 = submit(key, key_file.name, urls, "https://www.bing.com/indexnow")

    if res1 not in (200, 202) and res2 not in (200, 202):
        sys.exit("Falha ao submeter URLs no IndexNow em ambos os endpoints.")


if __name__ == "__main__":
    main()

# Repo düzeni incelemesi

Bu liste silme işlemi yapmaz. Aşağıdaki öğelerden herhangi biri kaldırılacaksa önce `git rm --cached <path>` ile Git takibinden çıkarılması değerlendirilmelidir.

## Takipte olan muhtemel gereksiz veya makineye özel dosyalar

- `.idea/` altındaki IntelliJ proje ayarları: `compiler.xml`, `encodings.xml`, `jarRepositories.xml`, `misc.xml`, `vcs.xml`, `lagerverwaltung.iml`
- `system.properties`: yerel/host ortamına bağlı görünür; kullanım amacı CI veya deployment için zorunlu değilse takipten çıkarılabilir.
- `seed.sql`: Flyway migration'ları zaten demo seed içeriyor; iki ayrı seed kaynağı olarak bakım maliyeti oluşturuyor. Silinmeden önce kullanım yerleri doğrulanmalı.
- `frontend/warehouse-app/public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`: Next.js başlangıç varlıkları; uygulama gerçekten kullanmıyorsa takipten çıkarılabilir.

## Şu an silinmemesi gerekenler

- `.mvn/`, `mvnw`, `mvnw.cmd`: tekrarlanabilir Maven çalıştırma için gerekli.
- `monitoring/`: Compose Prometheus/Grafana provisioning'i için kullanılıyor.
- `.github/`: CI ve OWASP workflow'ları aktif.
- Flyway migration'ları: şema ve demo başlangıcı için gerekli.

## `.gitignore` gözden geçirmesi

`.gitignore` genel olarak `target/`, `.idea`, `.vscode`, `.env`, loglar, geçici PowerShell scriptleri ve frontend scratch dosyalarını kapsıyor. `system.properties` ve bazı yerel notlar da ignore ediliyor; buna rağmen `system.properties` Git'te takipte olduğu için geçmişten kalan tracked dosya olarak ayrıca ele alınmalı. Bu adımda hiçbir dosya silinmedi veya Git'ten çıkarılmadı.

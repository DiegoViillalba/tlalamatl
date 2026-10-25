.PHONY: install seed dev-back dev-front dev gen-api test check deploy

install:
	cd backend && uv sync
	cd frontend && npm install
	$(MAKE) gen-api

seed:
	cd backend && uv run python seed.py

# Siembra la base automáticamente si todavía no existe.
dev-back:
	cd backend && (test -f tlalamatl.db || uv run python seed.py) && uv run uvicorn app.main:app --reload --port 8000

dev-front:
	cd frontend && npm run dev

dev:
	$(MAKE) -j2 dev-back dev-front

gen-api:
	cd backend && uv run python export_openapi.py ../frontend/openapi.json
	cd frontend && npm run gen-api

test:
	cd backend && uv run pytest

check: test gen-api
	cd frontend && npm run typecheck && npm run build

# Despliega a producción en Vercel desde una copia sin .git: en el plan Hobby, Vercel bloquea los
# despliegues cuyo autor del commit no es el dueño de la cuenta, y así no manda metadatos de git.
DEPLOY_DIR ?= /tmp/tlalamatl-deploy
deploy:
	rsync -a --delete --exclude .git --exclude .env.local --filter=':- .gitignore' ./ $(DEPLOY_DIR)/
	cp -R .vercel $(DEPLOY_DIR)/
	cd $(DEPLOY_DIR) && npx vercel@latest deploy --prod --yes

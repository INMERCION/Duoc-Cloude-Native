# Pedidos360

Angular local + Cognito + API Gateway REST + Spring Boot en EC2.

El proyecto implementa CRUD de pedidos, autorización por scope y persistencia H2 en archivo.
La base comienza vacía. El frontend ya solicita los cuatro scopes: debes habilitarlos en Cognito antes de iniciar sesión.

**[Guía paso a paso: EC2, Cognito, API Gateway, CORS y pruebas](docs/CRUD-AWS-PASO-A-PASO.md)**

## Requisitos

Java 17 y Node.js compatible con Angular 22. Maven Wrapper está incluido.
Las dependencias Angular se instalan con `npm ci` dentro de pedidos360-front.

## Backend

```powershell
cd pedidos360-backend
.\mvnw.cmd package
java -jar target/pedidos360-backend-0.0.1-SNAPSHOT.jar
```

Puerto 8888. Todas las operaciones requieren un access token Cognito válido.
Sin token, GET devuelve 401. La validación JWT también se aplica al acceso directo a EC2.

| Método | Ruta | Scope (prefijo rs-api-pedidos/) |
|---|---|---|
| GET | /api/pedidos | pedidos-read |
| GET | /api/pedidos/{id} | pedidos-read |
| POST | /api/pedidos | pedidos-create |
| PUT | /api/pedidos/{id} | pedidos-update |
| DELETE | /api/pedidos/{id} | pedidos-delete |

Configuración en application.properties, sobreescribible con DB_URL, DB_USERNAME,
DB_PASSWORD, COGNITO_ISSUER, COGNITO_CLIENT_ID y FRONTEND_ORIGIN.
En EC2 usa una ruta absoluta para DB_URL. No borres data/ al actualizar el JAR.

## Frontend

```powershell
cd pedidos360-front
npm start
```

Abre http://localhost:4200. La API se configura en src/app/api.config.ts y Cognito en src/main.ts.
Por defecto consume API Gateway, aunque ejecutes también un backend local.
Los pedidos son compartidos entre usuarios autorizados; no hay separación por propietario ni roles.

## Pruebas

```powershell
# Dentro de pedidos360-backend
.\mvnw.cmd test

# Dentro de pedidos360-front
npm run build
npm test -- --watch=false
```

Las pruebas automatizadas no llaman a AWS. La guía incluye la comprobación completa del despliegue.

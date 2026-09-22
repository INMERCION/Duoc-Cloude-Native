# Pedidos360

Proyecto de DUOC Cloud Native con un frontend Angular y una API Spring Boot, mantenidos en un unico repositorio.

## Estructura

- `pedidos360-front/`: interfaz Angular y autenticacion con Amazon Cognito.
- `pedidos360-backend/`: API REST Java con datos de pedidos de ejemplo.

## Requisitos

- Java 17, segun el `pom.xml` del backend.
- Node.js compatible con Angular 22 y npm (el frontend declara npm 11.16.0).
- El backend incluye Maven Wrapper; no requiere una instalacion global de Maven.

## Ejecutar el backend

Desde la raiz, en PowerShell:

```powershell
cd pedidos360-backend
.\mvnw.cmd spring-boot:run
```

La API se inicia en `http://localhost:8888`. El endpoint `GET /api/pedidos` devuelve pedidos de ejemplo.

En Linux o macOS se puede usar `sh mvnw spring-boot:run` dentro de la misma carpeta.

## Ejecutar el frontend

En otra terminal, desde la raiz:

```powershell
cd pedidos360-front
npm ci
npm start
```

Abrir `http://localhost:4200`.

Actualmente el frontend consulta una API desplegada en AWS API Gateway; no apunta al backend local. La URL se configura en `pedidos360-front/src/app/pedidos.service.ts`. La configuracion de Cognito y las URL de redireccion estan en `pedidos360-front/src/main.ts` y requieren los recursos AWS correspondientes para iniciar sesion.

## Comprobaciones

Desde `pedidos360-front/`:

```powershell
npm run build
npm test
```

Desde `pedidos360-backend/`:

```powershell
.\mvnw.cmd test
```

## Git

Ejecutar los comandos Git desde la raiz para gestionar ambos proyectos juntos. El `.gitignore` general complementa los archivos de cada proyecto y excluye dependencias, compilaciones, logs y archivos `.env` locales. Se conserva `package-lock.json` para reproducir la instalacion del frontend.

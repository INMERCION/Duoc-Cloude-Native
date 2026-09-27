# Pedidos360: despliegue del CRUD en EC2, Cognito y API Gateway

Esta guía corresponde a una **REST API**, al stage **test** y al frontend en **http://localhost:4200**. Los cambios de AWS se realizan manualmente; no fueron aplicados desde este proyecto.

## 1. Qué quedó implementado

- Spring Boot: listar, consultar por ID, crear, reemplazar y eliminar pedidos.
- Validación: cliente obligatorio (máximo 120 caracteres), producto obligatorio (máximo 160), cantidad entera entre 1 y 1000000 y estado permitido.
- Estados: EN_PREPARACION, ENVIADO, ENTREGADO.
- Persistencia H2 en archivo, mediante Spring Data JPA. La base empieza vacía; se retiraron los tres ejemplos fijos.
- Backend protegido por JWT: firma RS256, emisor, vigencia, token_use=access, client_id y scope por operación.
- Angular: inicio/cierre de sesión, carga automática, formulario de creación/edición, listado y confirmación de eliminación.
- No se muestran ni imprimen tokens. El interceptor solo adjunta el token a la API de pedidos.
- Los permisos de la interfaz ayudan al usuario; el control efectivo está en API Gateway y Spring Security.

H2 en archivo sirve para este laboratorio con **una instancia y un proceso del backend**. Conserva información al reiniciar el proceso usando la misma ruta. No replica datos, no reemplaza una base administrada y no sobrevive a perder el volumen. Respalda el directorio de datos con la aplicación detenida. Para varias instancias, migra a una base compartida.

## 2. Valores que debes mantener alineados

| Configuración | Valor preparado |
|---|---|
| Región | us-east-1 |
| User Pool | us-east-1_cRb1mCRID |
| App Client SPA | 72tfeld99bp84ph6k5qth991d8 |
| Dominio Cognito | us-east-1crb1mcrid.auth.us-east-1.amazoncognito.com |
| Resource Server identifier | rs-api-pedidos |
| API ID | 9wn5b7enec |
| Stage | test |
| Origen, callback y logout local | http://localhost:4200 |
| Puerto Spring Boot | 8888 |

La URL del frontend está en `pedidos360-front/src/app/api.config.ts`.
Cognito está en `pedidos360-front/src/main.ts`.
El backend acepta variables COGNITO_ISSUER, COGNITO_CLIENT_ID y FRONTEND_ORIGIN.

No cambies el identificador a la nomenclatura alternativa del informe: esta implementación utiliza **rs-api-pedidos**. Si tu consola tiene otros recursos, ajusta estos valores antes de desplegar.

## 3. Configurar Cognito

1. Abre Cognito en us-east-1 y selecciona el User Pool indicado.
2. Busca **Resource servers / Servidores de recursos** (la agrupación del menú puede variar).
3. Edita el servidor cuyo **Identifier** es `rs-api-pedidos`. El nombre visible puede ser distinto.
4. Conserva `pedidos-read` y agrega estos scopes. En el campo del nombre escribe solo la parte corta:

| Scope name | Descripción sugerida | Scope completo |
|---|---|---|
| pedidos-read | Consultar pedidos | rs-api-pedidos/pedidos-read |
| pedidos-create | Crear pedidos | rs-api-pedidos/pedidos-create |
| pedidos-update | Actualizar pedidos | rs-api-pedidos/pedidos-update |
| pedidos-delete | Eliminar pedidos | rs-api-pedidos/pedidos-delete |

5. Guarda.
6. Abre **App clients** y selecciona el cliente SPA `72tfeld99bp84ph6k5qth991d8`.
7. En **Login pages / Managed login pages**, edita la configuración.
8. Mantén **Authorization code grant**; el cliente público SPA no debe tener un secreto incrustado en Angular. Amplify gestiona PKCE.
9. Verifica la callback y la URL de cierre de sesión: `http://localhost:4200`, coincidiendo exactamente con main.ts.
10. Mantén `openid`, `email` y `profile`.
11. En **Custom scopes**, habilita los **cuatro scopes completos** anteriores.
12. Guarda. El frontend ya solicita los cuatro. Si arrancas antes de habilitarlos, Cognito puede devolver `invalid_scope`.
13. Al terminar la configuración, cierra la sesión anterior y vuelve a entrar. Un token emitido antes del cambio no adquiere permisos nuevos.

Esta configuración permite solicitar los cuatro permisos a los usuarios que inicien sesión con ese App Client. **No crea roles de administrador/lector ni filtra pedidos por propietario.** El listado es compartido. Si necesitas permisos distintos por persona, debes diseñar una política adicional; ocultar botones o crear otro cliente público no constituye por sí solo esa política.

Referencia: [Resource servers y scopes de Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html).

## 4. Publicar el JAR nuevo en EC2

El JAR listo para subir está en:

`pedidos360-backend/target/pedidos360-backend-0.0.1-SNAPSHOT.jar`

Para volver a construirlo, desde la raíz en PowerShell:

```powershell
cd pedidos360-backend
.\mvnw.cmd package
```

1. Sube ese JAR al bucket S3 que ya usaste. No subas el archivo `.jar.original`.
2. En EC2, detén **el proceso anterior de Pedidos360**. Si lo ejecutaste en primer plano, usa Ctrl+C en su terminal; si ya está administrado por un servicio, detén ese servicio.
3. En EC2, prepara una carpeta estable. Sustituye TU_BUCKET y RUTA_AL_JAR por el objeto real:

```bash
mkdir -p /home/ec2-user/pedidos360/data
cd /home/ec2-user/pedidos360
aws s3 cp s3://TU_BUCKET/RUTA_AL_JAR/pedidos360-backend-0.0.1-SNAPSHOT.jar pedidos360.jar
export DB_URL='jdbc:h2:file:/home/ec2-user/pedidos360/data/pedidos360'
export FRONTEND_ORIGIN='http://localhost:4200'
java -jar pedidos360.jar
```

Si el archivo está en la raíz del bucket, elimina RUTA_AL_JAR/ de la ruta S3.

4. Confirma que Spring Boot inicia en 8888. EC2 debe tener salida HTTPS a Cognito para descargar las claves públicas.
5. Esta prueba sin token **ahora debe devolver 401**, porque la API está protegida también en EC2:

```bash
curl -i http://localhost:8888/api/pedidos
```

6. En una segunda terminal puedes probar CORS sin token:

```bash
curl -i -X OPTIONS http://localhost:8888/api/pedidos/1 \
  -H 'Origin: http://localhost:4200' \
  -H 'Access-Control-Request-Method: PUT' \
  -H 'Access-Control-Request-Headers: authorization,content-type'
```

Debe responder 200 con Access-Control-Allow-Origin igual a http://localhost:4200.

La ejecución en primer plano termina si cierras la terminal. Para mantenerla, puedes usar este servicio en Amazon Linux, **después de detener la ejecución manual**. Si ya tienes un servicio, actualízalo en vez de crear otro:

```ini
# /etc/systemd/system/pedidos360.service
[Unit]
Description=Pedidos360 backend
Wants=network-online.target
After=network-online.target

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user/pedidos360
Environment="DB_URL=jdbc:h2:file:/home/ec2-user/pedidos360/data/pedidos360"
Environment="FRONTEND_ORIGIN=http://localhost:4200"
ExecStart=/usr/bin/java -jar /home/ec2-user/pedidos360/pedidos360.jar
Restart=on-failure
RestartSec=5
UMask=0077

[Install]
WantedBy=multi-user.target
```

Guárdalo con sudo y ejecuta:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pedidos360
sudo systemctl status pedidos360
sudo journalctl -u pedidos360 -n 80 --no-pager
```

En despliegues posteriores: detener el servicio, reemplazar el JAR y volver a iniciarlo. **No borres data/**. Ejecuta un solo proceso contra ese archivo H2.

## 5. Crear los métodos en API Gateway

1. Abre **API Gateway → REST API 9wn5b7enec → Resources**.
2. Conserva `/api/pedidos`.
3. Dentro de `pedidos`, crea un recurso hijo con path **{id}**.
4. Configura los métodos de la siguiente tabla. Sustituye EC2_HOST por la IP o DNS actual de la instancia.

| Recurso Gateway | Método | Integration HTTP method | Endpoint URL |
|---|---|---|---|
| /api/pedidos | GET | GET | http://EC2_HOST:8888/api/pedidos |
| /api/pedidos | POST | POST | http://EC2_HOST:8888/api/pedidos |
| /api/pedidos/{id} | GET | GET | http://EC2_HOST:8888/api/pedidos/{id} |
| /api/pedidos/{id} | PUT | PUT | http://EC2_HOST:8888/api/pedidos/{id} |
| /api/pedidos/{id} | DELETE | DELETE | http://EC2_HOST:8888/api/pedidos/{id} |

5. Para cada método selecciona **HTTP** y activa **HTTP proxy integration**. Revisa también el GET existente: debe usar el mismo esquema de proxy.
6. En los métodos con ID, verifica que el parámetro de ruta `id` exista en **Method request** y esté marcado como requerido.
7. En **Integration request → URL path parameters**, configura:
   - Name: `id`
   - Mapped from: `method.request.path.id`
8. No agregues `/test` a la URL de EC2. `test` es el stage de Gateway, no una ruta del controlador.
9. El proxy debe reenviar el JSON, Content-Type, Origin y especialmente **Authorization**. No elimines ni reemplaces ese encabezado: Spring Security lo necesita.
10. No configures plantillas que transformen todas las respuestas a 200. Con proxy, conserva 201, 204, 400, 401, 403 y 404 del backend.
11. Deja deshabilitada la caché de GET para que la lista refleje inmediatamente las escrituras.

La integración HTTP replica el esquema del laboratorio. Para un entorno real usa HTTPS hacia el backend o una integración privada con transporte apropiado: el JWT también viaja de Gateway a EC2. La validación JWT del backend evita escrituras anónimas, pero no cifra una conexión HTTP.

Referencia: [Integración HTTP y HTTP proxy](https://docs.aws.amazon.com/apigateway/latest/developerguide/setup-http-integrations.html).

## 6. Asignar el Authorizer y los scopes

1. En **Authorizers**, reutiliza el Cognito Authorizer del GET.
2. Verifica que utiliza el User Pool correcto y **Token source: Authorization**.
3. Deja vacía la expresión opcional **Token validation** basada en aud; esta configuración utiliza access tokens de Cognito con client_id.
4. Para cada método de negocio abre **Method request → Edit**.
5. Selecciona el Cognito Authorizer.
6. Agrega **solo el scope correspondiente**:

| Método | Authorization scopes |
|---|---|
| GET /api/pedidos | rs-api-pedidos/pedidos-read |
| GET /api/pedidos/{id} | rs-api-pedidos/pedidos-read |
| POST /api/pedidos | rs-api-pedidos/pedidos-create |
| PUT /api/pedidos/{id} | rs-api-pedidos/pedidos-update |
| DELETE /api/pedidos/{id} | rs-api-pedidos/pedidos-delete |

7. Mantén **API key required: false**, ya que Angular no envía una API key.
8. Guarda cada método.

No agregues todos los scopes a cada método: Gateway acepta la coincidencia con cualquiera de los enumerados. OPTIONS debe quedar sin Authorizer.

Usa la URL desplegada para probar con el **access token**. El botón de prueba del Authorizer en consola tiene un comportamiento específico para ID tokens y no demuestra este flujo de scopes.

Referencia: [Cognito Authorizer para REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-enable-cognito-user-pool.html).

## 7. Configurar CORS en los dos recursos

Hazlo en **/api/pedidos** y **/api/pedidos/{id}**.

1. Crea o edita **OPTIONS**.
2. **Authorization: NONE**, **API key required: false**.
3. Usa integración **MOCK**.
4. En Integration request, agrega una plantilla application/json con `{"statusCode":200}`.
5. En Method response 200, agrega los encabezados:
   - Access-Control-Allow-Origin
   - Access-Control-Allow-Methods
   - Access-Control-Allow-Headers
6. En Integration response 200, agrega estos valores estáticos, incluyendo las comillas simples:

| Encabezado | Valor estático |
|---|---|
| Access-Control-Allow-Origin | 'http://localhost:4200' |
| Access-Control-Allow-Methods | 'GET,POST,PUT,DELETE,OPTIONS' |
| Access-Control-Allow-Headers | 'Authorization,Content-Type' |

Si usas **Enable CORS** para generar OPTIONS, verifica estos mismos valores y que no haya heredado autorización. Los métodos HTTP proxy ya reciben CORS desde Spring Boot; no necesitan una respuesta de integración manual.

En **Gateway responses**, configura **DEFAULT_4XX** y **DEFAULT_5XX** con los mismos encabezados CORS. No cambies los códigos HTTP. Así el navegador puede mostrar errores generados por Gateway antes de llegar a EC2. Si ya personalizaste respuestas específicas como UNAUTHORIZED o ACCESS_DENIED, revisa también sus encabezados.

Referencia: [CORS en REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html).

## 8. Desplegar y probar desde Angular

1. Pulsa **Deploy API** y elige el stage existente **test**.
2. Desde la raíz del proyecto local:

```powershell
cd pedidos360-front
npm start
```

3. Abre **http://localhost:4200**; no uses otro origen como 127.0.0.1 sin cambiar Cognito y CORS.
4. Cierra la sesión anterior y vuelve a iniciar sesión.
5. Crea un pedido con cliente, producto, cantidad y estado.
6. Actualiza la lista y verifica que aparece.
7. Pulsa Editar, cambia cantidad o estado y guarda.
8. Recarga el navegador: el pedido debe seguir disponible.
9. Reinicia el backend en EC2 con la misma DB_URL y consulta otra vez: debe persistir.
10. Elimina ese pedido, confirma y actualiza la lista.

Desde DevTools → Network puedes comprobar las solicitudes reales sin publicar ni compartir el JWT. La aplicación ya no muestra el access token en la interfaz.

## 9. Probar con Postman y comprobar permisos

Usa OAuth 2.0, Authorization Code con PKCE y el **mismo App Client** del frontend; el backend valida client_id.

- Auth URL: https://us-east-1crb1mcrid.auth.us-east-1.amazoncognito.com/oauth2/authorize
- Access Token URL: https://us-east-1crb1mcrid.auth.us-east-1.amazoncognito.com/oauth2/token
- Client ID: 72tfeld99bp84ph6k5qth991d8
- Client secret: vacío
- Code challenge method: S256
- Callback: la que muestre Postman, agregada exactamente a las callbacks permitidas del App Client (conservando localhost).
- Scopes: openid email profile rs-api-pedidos/pedidos-read rs-api-pedidos/pedidos-create rs-api-pedidos/pedidos-update rs-api-pedidos/pedidos-delete

URL base: https://9wn5b7enec.execute-api.us-east-1.amazonaws.com/test/api/pedidos

Para POST y PUT: **Body → raw → JSON**:

```json
{
  "cliente": "Ana Pérez",
  "producto": "Notebook",
  "cantidad": 2,
  "estado": "EN_PREPARACION"
}
```

No envíes id al crear; usa el id devuelto para consultar, actualizar o eliminar. PUT recibe los cuatro campos completos.

| Caso | Resultado |
|---|---|
| GET con scope read | 200 y lista |
| POST con scope create | 201 y pedido con id |
| GET /{id} existente con read | 200 |
| PUT /{id} existente con update | 200 |
| DELETE /{id} existente con delete | 204 sin cuerpo |
| GET /{id} eliminado | 404 |
| Cantidad 0, negativa o fraccionaria / estado inválido | 400 |
| Llamada sin token | 401 |
| Token válido solo con read intentando escribir | Rechazo (Gateway puede devolver 401; backend devuelve 403) |

Para probar la última fila, solicita otro token con solo openid y rs-api-pedidos/pedidos-read. No basta con quitar un botón del frontend.

## 10. Diagnóstico rápido

| Síntoma | Revisar |
|---|---|
| invalid_scope en login | Scopes creados, habilitados en el App Client y escritos exactamente igual |
| 401 con token | Expiración, token_use=access, issuer, client_id, scope del método y reenvío de Authorization a EC2 |
| 403 desde backend | Scope de esa operación ausente |
| 403 Missing Authentication Token | Ruta, método, stage y Deploy API; no siempre significa JWT incorrecto |
| Error HTTP 0 / CORS | OPTIONS sin auth en ambos recursos y encabezados tanto en backend como Gateway responses |
| 404 al consultar un ID | ID inexistente o integración con ruta incorrecta |
| 405 | Método de integración distinto del método del backend |
| 500 / 502 / 504 | Logs de EC2, proceso activo, puerto 8888, IP actual y conectividad |
| GET sigue mostrando los tres ejemplos | JAR anterior en EC2 o respuesta MOCK en GET |
| Desaparecen pedidos al reiniciar | DB_URL o directorio de trabajo cambió, archivo/volumen eliminado |
| UI sin botones de escritura | Token antiguo o scopes faltantes; cerrar sesión y entrar nuevamente |

## 11. Verificación local

```powershell
# Dentro de pedidos360-backend
.\mvnw.cmd package

# Dentro de pedidos360-front
npm run build
npm test -- --watch=false
```

Las pruebas del backend utilizan una base **en memoria exclusiva de pruebas**. Comprueban CRUD, validaciones, 401/403/404, CORS y validadores de claims. Las pruebas de Angular simulan Cognito y HTTP: no reemplazan la prueba final contra AWS ni validan credenciales reales.

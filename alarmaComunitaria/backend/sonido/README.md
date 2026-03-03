# Módulo Sonido – Alarma Comunitaria

Servidor Flask que expone un endpoint para **activar la alarma sonora** en dispositivos configurados (por ejemplo, aplicaciones Android en la red local que exponen una URL para reproducir el sonido).

## Descripción

- Recibe una petición HTTP (GET o POST) en `/activar_alarma`.
- Reenvía una petición a cada URL de la lista de dispositivos (por defecto `http://<IP>:5005/sonar`).
- Responde con el resultado agregado (éxito o error).

## Requisitos

- Python 3.8+
- Dependencias: `flask`, `flask-cors`, `requests`

```bash
pip install flask flask-cors requests
```

O desde la raíz del backend:

```bash
pip install -r requirements.txt
```

(El `requirements.txt` del backend puede no incluir todas las de sonido; si falta algo, instalar con `pip install flask flask-cors requests`.)

## Configuración

En `servidorsonido.py` se define la lista de dispositivos:

```python
dispositivos = [
    'http://192.168.100.134:5005/sonar'
]
```

Modifica las URLs según las IP y puertos de tus dispositivos.

## Ejecución

```bash
cd backend/sonido
python servidorsonido.py
```

Por defecto el servidor escucha en `0.0.0.0:5020`.

## Uso

- **Activar alarma:**  
  `GET` o `POST` a `http://<host>:5020/activar_alarma`
- Respuesta exitosa: `{"status": "ok", "message": "Alarma activada en todos los dispositivos"}`.
- Si algún dispositivo falla: `{"status": "error", "message": "..."}` con código 500.

## Integración

Este módulo es independiente de la API Node.js. Puedes llamarlo desde el frontend, desde un botón en la app, o desde la API Node si añades un proxy o un cliente HTTP que llame a `http://<sonido-host>:5020/activar_alarma` cuando se dispare una alerta.

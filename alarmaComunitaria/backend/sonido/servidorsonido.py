from flask import Flask, jsonify, request
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Lista de dispositivos Android que simulan la alarma con Flask corriendo
dispositivos = [
    'http://192.168.100.134:5005/sonar'
]


@app.route('/')
def index():
    """Página de inicio del servidor de alarma sonora."""
    return '''
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Alarma Sonora</title></head>
    <body style="font-family: sans-serif; max-width: 600px; margin: 2rem auto; padding: 1rem;">
        <h1>Servidor de alarma sonora</h1>
        <p>Este es el módulo <strong>sonido</strong> de Alarma Comunitaria. No es la interfaz de cámaras.</p>
        <h2>¿Qué hace?</h2>
        <p>Al llamar a <code>/activar_alarma</code> se envían peticiones a los dispositivos configurados para que reproduzcan el sonido de alarma.</p>
        <h2>URLs útiles</h2>
        <ul>
            <li><strong>Este servidor (sonido):</strong> <a href="/activar_alarma">/activar_alarma</a> — activar alarma en dispositivos</li>
            <li><strong>Interfaz de cámaras:</strong> inicia <code>servidorcamara.py</code> y abre <code>http://localhost:5001/</code></li>
            <li><strong>API principal:</strong> <code>http://localhost:3000</code> (backend Node)</li>
            <li><strong>Frontend (mapa, notificaciones):</strong> <code>http://localhost:4200</code> (Angular)</li>
        </ul>
        <p><a href="/activar_alarma" style="display:inline-block; margin-top:1rem; padding:0.5rem 1rem; background:#c00; color:white; text-decoration:none; border-radius:4px;">Probar: activar alarma</a></p>
    </body>
    </html>
    '''


@app.route('/activar_alarma', methods=['POST', 'GET'])
def activar_alarma():
    try:
        for url in dispositivos:
            r = requests.get(url, timeout=15)
            r.raise_for_status()
        return jsonify({'status': 'ok', 'message': 'Alarma activada en todos los dispositivos'}), 200
    except requests.RequestException as e:
        return jsonify({'status': 'error', 'message': f'Error al activar alarma: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5020, debug=True)

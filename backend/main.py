from flask import Flask
from flask_cors import CORS
from mixRoutes import image
from beamRoutes import beam

app = Flask(__name__)
CORS(app)

app.register_blueprint(image)
app.register_blueprint(beam)


if __name__ == '__main__':
    app.run(debug=True)
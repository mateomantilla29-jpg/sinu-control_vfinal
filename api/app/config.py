import os

from dotenv import load_dotenv

# Carga las variables de entorno desde el archivo .env
# Esto debe hacerse ANTES de que se defina la clase Config
load_dotenv()

# Ruta base del proyecto (carpeta api/)
_BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


def _entero(nombre, defecto):
    valor = os.getenv(nombre, str(defecto)).strip()
    return int(valor) if valor.isdigit() else defecto


def url_mysql():
    """URL de conexion a MySQL 8 construida con las variables DB_* del .env."""
    usuario = os.getenv("DB_USER", "").strip()
    clave = os.getenv("DB_PASSWORD", "").strip()
    host = os.getenv("DB_HOST", "localhost").strip()
    puerto = os.getenv("DB_PORT", "3306").strip()
    nombre = os.getenv("DB_NAME", "sinu_db").strip()
    charset = os.getenv("DB_CHARSET", "utf8mb4").strip()
    return f"mysql+pymysql://{usuario}:{clave}@{host}:{puerto}/{nombre}?charset={charset}"


class Config:
    """Configuracion central de la aplicacion.

    - Desarrollo y produccion: MySQL 8 (obligatorio, variables DB_* en .env).
    - Pruebas (FLASK_TESTING=true): SQLite en memoria, o la base indicada en
      TEST_DATABASE_URL para correr la misma suite contra MySQL.
    """

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Reconecta si MySQL cerro la conexion por inactividad (wait_timeout)
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 280}

    SECRET_KEY = os.getenv("SECRET_KEY")

    # Expiracion del token JWT en minutos (un turno de servicio = 8 h)
    JWT_EXP_MINUTES = _entero("JWT_EXP_MINUTES", 480)

    # Dias de anticipacion por defecto para alertas de vencimiento (SINU: 3)
    DIAS_ALERTA_DEFECTO = _entero("DIAS_ALERTA_DEFECTO", 3)

    TESTING = os.getenv("FLASK_TESTING", "false").lower() == "true"

    if TESTING:
        SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL", "sqlite:///:memory:")
        if SQLALCHEMY_DATABASE_URI.startswith("sqlite"):
            SQLALCHEMY_ENGINE_OPTIONS = {}
        SECRET_KEY = SECRET_KEY or "test-key-for-pytest"
    else:
        if not SECRET_KEY:
            raise ValueError(
                "Falta SECRET_KEY en api/.env. Genérela con: python scripts/generate_secret.py"
            )
        if not os.getenv("DB_USER", "").strip():
            raise ValueError(
                "Falta DB_USER en api/.env. Sinu Control usa MySQL 8: complete DB_USER, "
                "DB_PASSWORD, DB_HOST, DB_PORT y DB_NAME (ver .env.example)."
            )
        SQLALCHEMY_DATABASE_URI = url_mysql()

    # ------------------------------------------------------------------
    # CORS: origenes permitidos
    # ------------------------------------------------------------------
    _origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "")
    if _origins_env:
        CORS_ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]
    else:
        CORS_ALLOWED_ORIGINS = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]

    BASE_DIR = _BASE_DIR

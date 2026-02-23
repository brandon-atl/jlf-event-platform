from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./jlf_erp.db"

    # Stripe
    stripe_api_key: str = ""
    stripe_webhook_secret: str = ""

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    # Resend
    resend_api_key: str = ""

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 1440

    # Magic Links
    magic_link_expiration_hours: int = 72

    # Application
    app_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./jlf_erp.db"

    # Stripe
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    # Resend
    resend_api_key: str = ""
    from_email: str = "noreply@justloveforest.com"

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 1440
    jwt_expiry_hours: int = 24

    # Magic Links
    magic_link_expiration_hours: int = 72
    magic_link_expiry_hours: int = 48

    # Application
    app_env: str = "development"
    app_url: str = "http://localhost:8000"
    api_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()

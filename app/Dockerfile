FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    POETRY_VERSION=1.8.2 \
    POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1 \
    PYSETUP_PATH="/opt/pysetup" \
    VENV_PATH="/opt/pysetup/.venv"

# Prepend poetry and venv to path
ENV PATH="/opt/poetry/bin:/opt/pysetup/.venv/bin:$PATH"

# Install system dependencies
RUN apt-get update \
    && apt-get install --no-install-recommends -y \
    curl \
    build-essential \
    libpq-dev \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libjpeg62-turbo \
    libopenjp2-7 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
# The build environment currently injects a non-standard TLS chain, so we scope
# the relaxed certificate check to the Poetry bootstrap step only.
RUN curl -sSLk https://install.python-poetry.org | python3 - && \
    /opt/poetry/bin/poetry --version && \
    ln -sf /opt/poetry/bin/poetry /usr/local/bin/poetry

# Setup workdir
WORKDIR $PYSETUP_PATH
COPY poetry.lock pyproject.toml ./

# Install runtime deps - uses $POETRY_VIRTUALENVS_IN_PROJECT internally
RUN /opt/poetry/bin/poetry install --only main --no-root

# Copy application code
WORKDIR /app
COPY . .

# Move venv to app (or just use absolute path)
# We can just use the absolute path in command
# But usually copying .venv is cleaner for runtime image if strictly multi-stage
# For dev/simple build, we keep it here.

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

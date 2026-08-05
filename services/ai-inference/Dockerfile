FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /opt/ptc-ai
COPY pyproject.toml README.md ./
COPY src ./src
RUN python -m pip install --no-cache-dir --upgrade pip && python -m pip install --no-cache-dir .
USER 65532:65532
ENTRYPOINT ["ptc-ai"]
CMD ["--help"]

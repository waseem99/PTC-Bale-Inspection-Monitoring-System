# syntax=docker/dockerfile:1.7

FROM python:3.12.5-alpine

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN addgroup -S edge && adduser -S -G edge edge \
  && mkdir -p /var/lib/ptc-bale/spool \
  && chown -R edge:edge /var/lib/ptc-bale /app

COPY --chown=edge:edge tools/edge-simulator/ptc_edge_spool.py /app/ptc_edge_spool.py
COPY --chown=edge:edge tools/edge-simulator/local_service.py /app/local_service.py

USER edge

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD python /app/ptc_edge_spool.py --database "${EDGE_SPOOL_DATABASE:-/var/lib/ptc-bale/spool/spool.sqlite3}" status >/dev/null || exit 1

CMD ["python", "/app/local_service.py"]

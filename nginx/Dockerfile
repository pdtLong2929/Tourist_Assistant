FROM nginx:alpine

RUN apk add --no-cache gettext

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf

COPY conf.d/default.conf /etc/nginx/default.conf.template

EXPOSE 80

CMD ["/bin/sh", "-c", "envsubst '${LOGIN_API_URL} ${FRONTEND_URL} ${SSL_TOGGLE} ${HOST_HEADER} ${DNS_RESOLVER}' < /etc/nginx/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
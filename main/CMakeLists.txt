idf_component_register(
  SRCS "app_main.cpp"
  INCLUDE_DIRS "."
  REQUIRES
    esp_event
    esp_netif
    idf_config
    idf_esim
    idf_inbox
    idf_logbuf
    idf_modem
    idf_push
    idf_sms
    idf_web
    idf_wifi
    nvs_flash
)

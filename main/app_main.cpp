#include "esp_err.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_event.h"
#include "idf_config.h"
#include "idf_esim.h"
#include "idf_inbox.h"
#include "idf_log.h"
#include "idf_modem.h"
#include "idf_push.h"
#include "idf_sms.h"
#include "idf_web.h"
#include "idf_wifi.h"
#include "nvs_flash.h"
#include "web_assets.h"

static const char* TAG = "sms_idf";

static bool s_nvs_was_erased = false;

static void init_nvs()
{
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        // 擦除会连 WiFi 凭据和全部配置一起清掉，设备将回到配网热点等人来救。
        // 标记下来，等日志系统就绪后大声记一笔，别让"配置凭空消失"变成悬案
        ESP_LOGE(TAG, "NVS 分区需要擦除重建(%s)，全部配置将丢失!", esp_err_to_name(err));
        s_nvs_was_erased = true;
        ESP_ERROR_CHECK(nvs_flash_erase());
        err = nvs_flash_init();
    }
    ESP_ERROR_CHECK(err);
}

static void log_start_result(const char* name, esp_err_t err)
{
    if (err == ESP_OK) return;
    ESP_LOGE(TAG, "%s start failed: %s", name, esp_err_to_name(err));
    idf_logf("%s 启动失败: %s", name, esp_err_to_name(err));
}

extern "C" void app_main(void)
{
    init_nvs();
    idf_log_init();
    if (s_nvs_was_erased) {
        idf_log_line("警告: NVS 分区已被擦除重建，配置与 WiFi 凭据丢失，请重新配网");
    }
    idf_inbox_init();
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    // 配置读取失败降级为默认值继续启动：无人值守设备宁可跑默认配置等人来修，
    // 也不要因 NVS 读错误陷入 panic 重启循环
    esp_err_t cfg_err = idf_config_load();
    if (cfg_err != ESP_OK) {
        ESP_LOGE(TAG, "config load failed: %s, continuing with defaults", esp_err_to_name(cfg_err));
        idf_logf("配置加载失败(%s)，以默认配置继续启动", esp_err_to_name(cfg_err));
    }

    // 原生 ESP-IDF 启动：Web、配置、WiFi、推送、模组、短信均不依赖 Arduino runtime。
    ESP_LOGI(TAG, "ESP-IDF port bootstrap started");
    idf_logf("ESP-IDF 迁移版启动: %s", IDF_FW_VERSION);
    ESP_LOGI(TAG, "web hash=%s shell=%u css=%u js=%u",
             WEB_ASSET_HASH,
             static_cast<unsigned>(WEB_INDEX.length),
             static_cast<unsigned>(WEB_APP_CSS.length),
             static_cast<unsigned>(WEB_APP_JS.length));
    idf_logf("Web 资源 hash=%s shell=%u css=%u js=%u",
             WEB_ASSET_HASH,
             static_cast<unsigned>(WEB_INDEX.length),
             static_cast<unsigned>(WEB_APP_CSS.length),
             static_cast<unsigned>(WEB_APP_JS.length));
    idf_esim_init();  // 注册 SIM 热插拔钩子，换卡后 EID 缓存随之失效
    log_start_result("WiFi", idf_wifi_start(idf_config_get()));
    log_start_result("推送后台 worker", idf_push_start());
    log_start_result("HTTP 服务器", idf_web_start());
    log_start_result("模组", idf_modem_start(idf_config_get()));
    log_start_result("短信接收", idf_sms_start());
}

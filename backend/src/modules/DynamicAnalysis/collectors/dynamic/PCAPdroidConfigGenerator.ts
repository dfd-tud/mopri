// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export interface PCAPdroidConfig {
    ip_mode: string;
    start_at_boot: boolean;
    app_language: string;
    capture_interface: string;
    pcapng_format: boolean;
    block_quic_mode: string;
    appver: number;
    tls_decryption: boolean;
    pcapdroid_trailer: boolean;
    restart_on_disconnect: boolean;
    full_payload: boolean;
    firewall_wl_init: number;
    app_theme: string;
    license: string;
    http_server_port: string;
    collector_port: string;
    auto_block_private_dns: boolean;
    root_capture: boolean;
    pcap_dump_mode_v2: string;
    collector_ip_address: string;
    malware_detection: boolean;
}

export class PCAPdroidConfigGenerator {
  private config: PCAPdroidConfig;

    constructor(initialConfig: PCAPdroidConfig) {
        this.config = initialConfig;
    }

    public updateConfig(newConfig: Partial<PCAPdroidConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    public getConfig(): PCAPdroidConfig{
        return this.config;
    }

    public toXML(): string {
	    let xml = "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>\n";
        xml += '<map>\n';
        for (const [key, value] of Object.entries(this.config)) {
            if (typeof value === 'boolean') {
                xml += `    <boolean name="${key}" value="${value}" />\n`;
            } else if (typeof value === 'number') {
                xml += `    <int name="${key}" value="${value}" />\n`;
            } else {
                xml += `    <string name="${key}">${value}</string>\n`;
            }
        }
        xml += '</map>\n';
        return xml;
    }
}

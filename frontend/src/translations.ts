/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { TrafficRecordingMethod } from '@mopri/schema'
export enum AggregatedFiguresLabels {
  countries = 'Countries',
  nonEuCountries = 'Non-EU Countries',
  hostingProviders = 'Hosting Providers',
  organisations = 'Organisations',
  hostnames = 'Hostnames',
  ips = 'IPs',
  nonEURequests = 'Non-EU Requests',
  totalRequests = 'Total Requests',
  receiversOnBlocklist = 'Blocklisted',
  requestsToReceiversOnBlocklist = 'Requests to Receivers on Blocklist',
  requestsWithSensitiveData = 'Requests with Sensitive Data',
  sensitiveValuesTransmitted = 'Sensitive Value Types'
}

export enum DeviceDataLabels {
  platform = 'Platform',
  runTarget = 'Run Target',
  deviceName = 'Device Name',
  osVersion = 'OS Version',
  osBuild = 'OS Build',
  manufacturer = 'Manufacturer',
  model = 'Model',
  modelCodeName = 'Model Code Name',
  architectures = 'Architectures',
  adId = 'Advertising ID'
}

export const TrafficRecordingMethodLabels: { [key in TrafficRecordingMethod]: string } = {
  [TrafficRecordingMethod.TweaselBasic]: 'Tweasel-Cyanoacrylate (mitmproxy)',
  [TrafficRecordingMethod.TweaselWithHttpTools]: 'Tweasel-Cyanoacrylate (mitmproxy) with Cert Pinning Bypass [Dynamic Instrumentation]',
  [TrafficRecordingMethod.TweaselWithAPKPatching]: 'Tweasel-Cyanoacrylate (mitmproxy) with APK Patching',
  [TrafficRecordingMethod.PCAPDroidWithFriTap]: 'PCAP Recording with Separated Encryption Key Extraction [Dynamic Instrumentation]',
  [TrafficRecordingMethod.PCAPDroidMetaOnly]: 'PCAP Recording (Metadata-Only Capture)'
}

export const TrafficRecordingMethodDescriptions: { [key in TrafficRecordingMethod]: string } = {
  [TrafficRecordingMethod.TweaselBasic]: 'This method captures network traffic using the Cyanoacrylate library from Tweasel which interally uses mitmproxy and wireguard VPN, but does not employ dynamic instrumentation techniques. It is suitable for basic traffic analysis - when the app does not apply Certpinning - without modifying the application at runtime.',
  [TrafficRecordingMethod.TweaselWithHttpTools]: 'This approach utilizes the Cyanoacrylate library from Tweasel with mitmproxy while disabling certificate pinning. Dynamic instrumentation is applied to modify the app\'s behavior at runtime, allowing for more comprehensive traffic analysis and interception of HTTPS traffic.',
  [TrafficRecordingMethod.TweaselWithAPKPatching]: 'In this method, the APK of the application is patched prior to execution. This allows for the interception of network traffic using Cyanoacrylate (Tweasel), enabling analysis of the app\'s behavior and communication without the need for runtime modifications.',
  [TrafficRecordingMethod.PCAPDroidWithFriTap]: 'This method employs on-device traffic recording through the PcapDroid VPN app, combined with dynamic instrumentation using FriTap, to extract encryption keys directly from the application\'s runtime environment. This approach enables a less intrusive capture of encrypted traffic while simultaneously obtaining the keys necessary to decrypt the payloads. In addition to providing decrypted HTTP traffic, this method generates a PCAP file that can be analyzed for further insights into the application\'s network behavior and data transmission patterns.',
  [TrafficRecordingMethod.PCAPDroidMetaOnly]: 'This approach records network traffic in PCAP format without attempting to decrypt it. It is useful for capturing raw traffic data for later analysis, but does not provide insights into the content of encrypted communications.'
}

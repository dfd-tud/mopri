#!/usr/bin/env python3
# SPDX-FileCopyrightText: © Exodus Privacy
# SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
#
# SPDX-License-Identifier: AGPL-3.0-or-later

import argparse
import json
import os.path
import sys

from exodus_core.analysis.static_analysis import StaticAnalysis

class AnalysisHelper(StaticAnalysis):
    def create_json_report(self):
        return {
            'application': {
                'handle': self.get_package(),
                'version_name': self.get_version(),
                'version_code': self.get_version_code(),
                'uaid': self.get_application_universal_id(),
                'name': self.get_app_name(),
            },
            'apk': {
                'path': self.apk_path,
                'checksum': self.get_sha256(),
             },
            'permissions': self.get_permissions(),
            'libraries': [library for library in self.get_libraries()],
            'trackers': [
                {'name': t.name, 'id': t.id} for t in self.detect_trackers()
            ],
        }

def analyze_apk(apk):
    analysis = AnalysisHelper(apk)
    analysis.load_trackers_signatures()
    report = json.dumps(analysis.create_json_report(), indent=2)
    print(report)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('apk', help='the apk file to analyse')
    args = parser.parse_args()

    if not os.path.isfile(args.apk):
        print('ERROR: {}'.format('apk file should exist'))
        sys.exit(1)

    analyze_apk(args.apk)

if __name__ == '__main__':
    main()

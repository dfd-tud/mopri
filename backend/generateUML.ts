// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createDiagram, TsUML2Settings } from "tsuml2";

const settings = new TsUML2Settings();
settings.glob = `./src/modules/**/!(*.d|*.spec).ts`;
settings.outMermaidDsl = "./uml.dsl";
settings.outFile = "./uml.svg";
settings.propertyTypes = false;
settings.memberAssociations = true;
createDiagram(settings);

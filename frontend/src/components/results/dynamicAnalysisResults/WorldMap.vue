<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <svg ref="svg" :width="width" :height="height">
  </svg>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { FeatureCollection } from 'geojson';
import * as d3 from 'd3';
const props = defineProps<{ countryCodes: string[], width: number, height: number }>();

interface FrequencyCount {
  [code: string]: number; // Maps country codes to their frequency counts
}

const svg = ref<SVGSVGElement | null>(null);

const geoJsonUrl = 'https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson';
let geoData: FeatureCollection | null = null;

const drawMap = () => {
  if (!geoData || !svg.value) return;

  // Create a projection
  const projection = d3.geoMercator()
    .scale(100)
    // center map
    .translate([props.width / 2, props.height / 2]);

  // Create a path generator
  const path = d3.geoPath().projection(projection);

  // Count frequency of each country code
  const frequency = countFrequencies(props.countryCodes);
  // Get the maximum frequency for color scaling
  const maxFrequency = Math.max(...Object.values(frequency));

  // Create a color scale
  const colorScale = d3.scaleSequential(d3.interpolateSpectral)
    .domain([0, maxFrequency]);
  // Bind data and create/update the map
  const countries = d3.select(svg.value)
    .selectAll('path')
    .data(geoData.features);

  countries.enter()
    .append('path')
    .attr('d', path)
    .attr('fill', d => {
      const countryCode = d.properties?.iso_a2;
      const freq = frequency[countryCode];
      // if country code not in frequencies color the country white
      return freq ? colorScale(freq) : 'white';
    })
    .attr('stroke', 'black')
    .attr('stroke-width', 0.5);
};

function countFrequencies(countryCodes: string[]): FrequencyCount {
  return countryCodes.reduce<FrequencyCount>((acc, code) => {
    acc[code] = (acc[code] || 0) + 1; // Increment the count for the country code
    return acc;
  }, {});
}

onMounted(async () => {
  // Fetch GeoJSON data
  const response = await fetch(geoJsonUrl);
  geoData = await response.json();
  drawMap();
});

// Watch for changes in countryCodes prop
watch(() => props.countryCodes, () => {
  drawMap();
});
</script>

<style>
/* Add any additional styles here */
</style>

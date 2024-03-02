package com.amazon.customerService.utils;

import java.lang.management.ManagementFactory;
import java.lang.management.RuntimeMXBean;
import java.time.Duration;
import java.time.Instant;

import org.apache.commons.lang3.StringEscapeUtils;

import com.amazon.customerService.config.AppConfig;
import com.amazon.customerService.model.metrics.MetricWrapper;
import com.amazon.customerService.service.EcsMetaDataService;
import com.amazon.customerService.service.EksMetricsService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class TimingUtils {

    public static void measureTime(Instant endTime) {
        RuntimeMXBean bean = ManagementFactory.getRuntimeMXBean();
        Instant startTime = Instant.ofEpochMilli(bean.getStartTime());
        Duration springBootStartTime = Duration.between(startTime, endTime);

        EcsMetaDataService ecsMetaDataService = new EcsMetaDataService();
        EksMetricsService eksMetricsService = new EksMetricsService();

        MetricWrapper metricWrapper = ecsMetaDataService.getMetaData();

        if (metricWrapper == null) {
            metricWrapper = eksMetricsService.getMetaData();
        }

        if (metricWrapper != null) {
            metricWrapper.setVersion(AppConfig.APPLICATION_VERSION);
            metricWrapper.setSpringBootStartDuration(springBootStartTime);
            metricWrapper.setSpringBootReadyTime(endTime);
            ObjectMapper mapper = new ObjectMapper()
                    .registerModule(new JavaTimeModule());

            try {
                String metricsJson = mapper.writeValueAsString(metricWrapper);
                log.info("Metrics: " + StringEscapeUtils.unescapeJson(metricsJson));
            } catch (JsonProcessingException e) {
                log.error(e.getMessage());
            }
        }
    }

}

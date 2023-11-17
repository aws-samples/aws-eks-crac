package com.amazon.customerService.service;

import com.amazon.customerService.config.AppConfig;
import com.amazon.customerService.model.metrics.MetricWrapper;
import com.amazon.customerService.repository.CustomerRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringEscapeUtils;
import org.crac.Context;
import org.crac.Core;
import org.crac.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.lang.management.RuntimeMXBean;
import java.text.SimpleDateFormat;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

@Slf4j
@Service
public class TimingService implements Resource {

    private static Instant endTime;

    @Autowired
    CustomerRepository customerRepository;

    private TimingService() {
        Core.getGlobalContext().register(this);
    }

    @Override
    public void beforeCheckpoint(Context<? extends Resource> context) throws Exception {
        System.out.println("Executing beforeCheckpoint...");
        customerRepository.closeClient();
    }

    @Override
    public void afterRestore(Context<? extends Resource> context) throws Exception {
        log.info("Executing afterRestore ...");

        TimingService.measureTime();

        SimpleDateFormat sdfDate = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS");//dd/MM/yyyy

        Date now = new Date();
        String strDate = sdfDate.format(now);
        log.info("Time after restore and before re-creating the client:" + strDate);

        customerRepository.createClient();

        now = new Date();
        strDate = sdfDate.format(now);
        log.info("Time after re-creating the client:" + strDate);

    }

    public static void measureTime() {
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

    @EventListener(ApplicationReadyEvent.class)
    public void startApp() {
        endTime = Instant.now();
    }
}

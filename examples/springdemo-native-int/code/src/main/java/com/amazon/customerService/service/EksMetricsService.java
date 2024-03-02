package com.amazon.customerService.service;

import com.amazon.customerService.model.metrics.MetricWrapper;
import com.amazon.customerService.model.metrics.PodMetric;
import io.kubernetes.client.openapi.ApiClient;
import io.kubernetes.client.openapi.ApiException;
import io.kubernetes.client.openapi.Configuration;
import io.kubernetes.client.openapi.apis.CoreV1Api;
import io.kubernetes.client.openapi.models.V1Pod;
import io.kubernetes.client.openapi.models.V1PodCondition;
import io.kubernetes.client.util.ClientBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Objects;

@Slf4j
@Service
public class EksMetricsService {
    public MetricWrapper getMetaData() {

        MetricWrapper metricWrapper = new MetricWrapper();

        try {
            ApiClient client = ClientBuilder.cluster().build();
            Configuration.setDefaultApiClient(client);

            BufferedReader reader = new BufferedReader(new FileReader("/var/run/secrets/kubernetes.io/serviceaccount/namespace"));
            String namespaceName = reader.readLine();
            log.info("Namespace: " + namespaceName);

            reader.close();

            String podName = System.getenv("HOSTNAME");
            log.info("Pod: " + podName);

            CoreV1Api api = new CoreV1Api();
            V1Pod pod = api.readNamespacedPod(podName, namespaceName, null, null, null);

            OffsetDateTime podScheduled = null, podReady = null;

            for (V1PodCondition condition : Objects.requireNonNull(pod.getStatus()).getConditions()) {
                if (condition.getType().equals("PodScheduled")) {
                    if (condition.getStatus().equals("True")) {
                        podScheduled = condition.getLastTransitionTime();
                    }
                } else if (condition.getType().equals("Ready")) {
                    if (condition.getStatus().equals("True")) {
                        podReady = condition.getLastTransitionTime();
                    }
                }
            }

            if (podReady != null && podScheduled != null) {

                PodMetric podMetric = new PodMetric(podScheduled.toInstant(), podReady.toInstant(), podName);
                metricWrapper.setPodMetric(podMetric);

                return metricWrapper;

            } else
                log.info("Something is null");
        } catch (ApiException exc) {
            log.error("Couldn't generate k8s client");
            log.error(exc.getResponseBody());

            return null;
        } catch (IOException exc) {
            exc.printStackTrace();
            return null;
        } catch (NumberFormatException exc) {
            exc.printStackTrace();
            return null;
        }

        return metricWrapper;
    }
}

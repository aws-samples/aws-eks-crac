package com.amazon.customerService.model.metrics;

import java.time.Instant;
import java.util.Objects;

public class PodMetric {

    private Instant podScheduled;
    private Instant podReady;
    private String podId;

    public PodMetric() {

    }

    public PodMetric(Instant podScheduled, Instant podReady, String podId) {
        this.podScheduled = podScheduled;
        this.podReady = podReady;
        this.podId = podId;
    }

    @Override
    public String toString() {
        return "PodMetric{" +
                "podScheduled=" + podScheduled +
                ", podReady=" + podReady +
                ", podId='" + podId + '\'' +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PodMetric podMetric = (PodMetric) o;
        return Objects.equals(podId, podMetric.podId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(podId);
    }

    public Instant getPodScheduled() {
        return podScheduled;
    }

    public void setPodScheduled(Instant podScheduled) {
        this.podScheduled = podScheduled;
    }

    public Instant getPodReady() {
        return podReady;
    }

    public void setPodReady(Instant podReady) {
        this.podReady = podReady;
    }

    public String getPodId() {
        return podId;
    }

    public void setPodId(String podId) {
        this.podId = podId;
    }
}

/*
 * Copyright 2010-2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

package com.amazon.customerService.repository;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.crac.Context;
import org.crac.Core;
import org.crac.Resource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import com.amazon.customerService.model.Customer;
import com.amazon.customerService.utils.TimingUtils;

import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.auth.credentials.EnvironmentVariableCredentialsProvider;
import software.amazon.awssdk.auth.credentials.WebIdentityTokenFileCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DeleteItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.ScanRequest;

@Slf4j
@Repository
public class CustomerRepository {

    public static final String TABLE_NAME = "Customer";
    public static final String ID_COLUMN = "Id";
    public static final String NAME_COLUMN = "Name";
    public static final String EMAIL_COLUMN = "Email";
    public static final String ACCOUNT_NUMBER_COLUMN = "AccountNumber";
    public static final String REGISTRATION_DATE_COLUMN = "RegistrationDate";
    private final SimpleDateFormat sdf;
    DynamoDbClient client;
    
    @Value("${mode}")
    private String mode;
    
    private final Resource cracHandler;
    
    public CustomerRepository() {
        this.client = createDynamoDbClient();

        sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
        
        cracHandler = new Resource() {
            @Override
            public void beforeCheckpoint(Context<? extends Resource> context) {
               log.info("Executing beforeCheckpoint...");
               closeClient();
            }

            @Override
            public void afterRestore(Context<? extends Resource> context) {
                log.info("Executing afterRestore ...");
                createClient();
                log.info("Invoking measureTime while setting end time to now...");
                TimingUtils.measureTime(Instant.now());
            }
        };

        Core.getGlobalContext().register(cracHandler);
    }
    
    public Customer save(final Customer customer) {

        customer.setId(UUID.randomUUID().toString());

        if (customer.getRegDate() == null) {
            customer.setRegDate(new Date());
        }

        PutItemRequest putItemRequest = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(convertPojoToMap(customer))
                .build();

        client.putItem(putItemRequest);

        return customer;
    }

    public Customer findById(final String id) {

        log.debug("Find customer with id: " + id);

        Map<String, AttributeValue> key = new HashMap<>();
        key.put(ID_COLUMN, AttributeValue.builder().s(id).build());

        GetItemRequest getItemRequest = GetItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(key)
                .build();

        GetItemResponse item = client.getItem(getItemRequest);
        Customer customer = null;
        if (item.hasItem()) {
            Map<String, AttributeValue> itemAttr = item.item();
            customer = convertMapToPojo(itemAttr);
        }

        return customer;
    }

    public List<Customer> findAll() {

        log.debug("Find all customers");
        List<Customer> customerList = new ArrayList<>();

        ScanRequest scanRequest = ScanRequest.builder().
                tableName(TABLE_NAME).
                build();

        List<Map<String, AttributeValue>> list = client.scan(scanRequest).items();

        for (Map<String, AttributeValue> item : list) {
            Customer customer = convertMapToPojo(item);
            customerList.add(customer);
        }

        log.debug("Found customers: ");
        for (Customer customer : customerList
        ) {
            log.debug("  -> " + customer);
        }

        return customerList;
    }

    public void deleteById(String id) {

        log.debug("Delete customer with id: " + id);

        Map<String, AttributeValue> key = new HashMap<>();
        key.put(ID_COLUMN, AttributeValue.builder().s(id).build());

        DeleteItemRequest deleteItemRequest = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(key)
                .build();

        client.deleteItem(deleteItemRequest);
    }

    private Map<String, AttributeValue> convertPojoToMap(final Customer customer) {
        Map<String, AttributeValue> item = new HashMap<>();

        item.put(ID_COLUMN, AttributeValue.builder().s(customer.getId()).build());
        item.put(NAME_COLUMN, AttributeValue.builder().s(customer.getName()).build());
        item.put(EMAIL_COLUMN, AttributeValue.builder().s(customer.getEmail()).build());
        item.put(ACCOUNT_NUMBER_COLUMN, AttributeValue.builder().s(customer.getAccountNumber()).build());
        item.put(REGISTRATION_DATE_COLUMN, AttributeValue.builder().s(sdf.format(customer.getRegDate())).build());

        return item;
    }

    private Customer convertMapToPojo(final Map<String, AttributeValue> item) {
        Customer customer = new Customer();

        customer.setAccountNumber(item.get(ACCOUNT_NUMBER_COLUMN).s());
        customer.setEmail(item.get(EMAIL_COLUMN).s());
        customer.setAccountNumber(item.get(ACCOUNT_NUMBER_COLUMN).s());
        customer.setId(item.get(ID_COLUMN).s());

        Date registrationDate = null;

        try {
            registrationDate = sdf.parse(item.get(REGISTRATION_DATE_COLUMN).s());
        } catch (ParseException exc) {
            log.error(exc.toString());
        }

        customer.setRegDate(registrationDate);

        return customer;
    }

    public void closeClient() {
        client.close();
    }

    public void createClient() {
        client = createDynamoDbClient();
    }

    public DynamoDbClient createDynamoDbClient() {
    	log.info("Mode:" + mode);
        if ("ci".equals(mode)) {
            return DynamoDbClient.builder()
                    .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
                    .region(Region.EU_WEST_1)
                    .build();
        }

        return DynamoDbClient.builder()
                .credentialsProvider(WebIdentityTokenFileCredentialsProvider.create())
                .region(Region.EU_WEST_1)
                .build();
    }
}

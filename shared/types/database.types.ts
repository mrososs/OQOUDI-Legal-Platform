
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"entity_id": string | null,"entity_type": string,"id": number,"metadata": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type": string,"id"?: never,"metadata"?: NonNullable<Json>
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"id"?: never,"metadata"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"availability_exceptions": {
                  Row: {
                    "created_at": string,"end_time": string | null,"exception_date": string,"id": string,"lawyer_id": string | null,"reason": string | null,"start_time": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_time"?: string | null,"exception_date": string,"id"?: string,"lawyer_id"?: string | null,"reason"?: string | null,"start_time"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"end_time"?: string | null,"exception_date"?: string,"id"?: string,"lawyer_id"?: string | null,"reason"?: string | null,"start_time"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_exceptions_lawyer_id_fkey"
      columns: ["lawyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"availability_rules": {
                  Row: {
                    "created_at": string,"end_time": string,"id": string,"is_active": boolean,"lawyer_id": string | null,"start_time": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_time": string,"id"?: string,"is_active"?: boolean,"lawyer_id"?: string | null,"start_time": string,"weekday": number
                  }
                  Update: {
                    "created_at"?: string,"end_time"?: string,"id"?: string,"is_active"?: boolean,"lawyer_id"?: string | null,"start_time"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_rules_lawyer_id_fkey"
      columns: ["lawyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"consultation_bookings": {
                  Row: {
                    "created_at": string,"ends_at": string,"hold_expires_at": string | null,"id": string,"lawyer_id": string | null,"meeting_provider": string,"meeting_published_at": string | null,"meeting_url": string | null,"order_id": string,"starts_at": string,"status": Database["public"]['Enums']["booking_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at": string,"hold_expires_at"?: string | null,"id"?: string,"lawyer_id"?: string | null,"meeting_provider"?: string,"meeting_published_at"?: string | null,"meeting_url"?: string | null,"order_id": string,"starts_at": string,"status"?: Database["public"]['Enums']["booking_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string,"hold_expires_at"?: string | null,"id"?: string,"lawyer_id"?: string | null,"meeting_provider"?: string,"meeting_published_at"?: string | null,"meeting_url"?: string | null,"order_id"?: string,"starts_at"?: string,"status"?: Database["public"]['Enums']["booking_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consultation_bookings_lawyer_id_fkey"
      columns: ["lawyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consultation_bookings_order_id_fkey"
      columns: ["order_id"]
isOneToOne: true
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"consultation_responses": {
                  Row: {
                    "author_id": string | null,"body": string,"id": string,"order_id": string,"published_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body": string,"id"?: string,"order_id": string,"published_at"?: string,"version": number
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"id"?: string,"order_id"?: string,"published_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "consultation_responses_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consultation_responses_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_messages": {
                  Row: {
                    "created_at": string,"email": string | null,"handled_at": string | null,"id": string,"message": string,"name": string,"phone": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"handled_at"?: string | null,"id"?: string,"message": string,"name": string,"phone": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"handled_at"?: string | null,"id"?: string,"message"?: string,"name"?: string,"phone"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contact_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"content_pages": {
                  Row: {
                    "body": NonNullable<Json>,"is_published": boolean,"slug": string,"title": NonNullable<Json>,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: NonNullable<Json>,"is_published"?: boolean,"slug": string,"title": NonNullable<Json>,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "body"?: NonNullable<Json>,"is_published"?: boolean,"slug"?: string,"title"?: NonNullable<Json>,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_pages_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_account_members": {
                  Row: {
                    "account_id": string,"created_at": string,"member_role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"created_at"?: string,"member_role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "account_id"?: string,"created_at"?: string,"member_role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_account_members_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "customer_accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customer_account_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_accounts": {
                  Row: {
                    "created_at": string,"created_by": string,"display_name": string,"id": string,"kind": Database["public"]['Enums']["account_kind"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"display_name": string,"id"?: string,"kind": Database["public"]['Enums']["account_kind"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"display_name"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["account_kind"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_accounts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "bucket": string,"created_at": string,"delivery_id": string | null,"extension": string,"form_field_id": string | null,"id": string,"kind": Database["public"]['Enums']["document_kind"],"message_id": string | null,"mime_type": string,"order_id": string | null,"original_name": string,"ready_at": string | null,"response_id": string | null,"size_bytes": number,"status": Database["public"]['Enums']["document_status"],"storage_path": string,"uploaded_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket"?: string,"created_at"?: string,"delivery_id"?: string | null,"extension": string,"form_field_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["document_kind"],"message_id"?: string | null,"mime_type": string,"order_id"?: string | null,"original_name": string,"ready_at"?: string | null,"response_id"?: string | null,"size_bytes": number,"status"?: Database["public"]['Enums']["document_status"],"storage_path": string,"uploaded_by": string
                  }
                  Update: {
                    "bucket"?: string,"created_at"?: string,"delivery_id"?: string | null,"extension"?: string,"form_field_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["document_kind"],"message_id"?: string | null,"mime_type"?: string,"order_id"?: string | null,"original_name"?: string,"ready_at"?: string | null,"response_id"?: string | null,"size_bytes"?: number,"status"?: Database["public"]['Enums']["document_status"],"storage_path"?: string,"uploaded_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_delivery_id_fkey"
      columns: ["delivery_id"]
isOneToOne: false
      referencedRelation: "order_deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_message_id_fkey"
      columns: ["message_id"]
isOneToOne: false
      referencedRelation: "order_messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_response_id_fkey"
      columns: ["response_id"]
isOneToOne: false
      referencedRelation: "consultation_responses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"faq_entries": {
                  Row: {
                    "answer": NonNullable<Json>,"created_at": string,"group_key": string,"group_title": NonNullable<Json>,"id": string,"is_published": boolean,"question": NonNullable<Json>,"show_on_home": boolean,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": NonNullable<Json>,"created_at"?: string,"group_key": string,"group_title": NonNullable<Json>,"id"?: string,"is_published"?: boolean,"question": NonNullable<Json>,"show_on_home"?: boolean,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "answer"?: NonNullable<Json>,"created_at"?: string,"group_key"?: string,"group_title"?: NonNullable<Json>,"id"?: string,"is_published"?: boolean,"question"?: NonNullable<Json>,"show_on_home"?: boolean,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"lawyer_profiles": {
                  Row: {
                    "accepts_consultations": boolean,"bio": string | null,"created_at": string,"display_name": string,"is_active": boolean,"title": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepts_consultations"?: boolean,"bio"?: string | null,"created_at"?: string,"display_name": string,"is_active"?: boolean,"title"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "accepts_consultations"?: boolean,"bio"?: string | null,"created_at"?: string,"display_name"?: string,"is_active"?: boolean,"title"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lawyer_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": string,"order_id": string | null,"payload": NonNullable<Json>,"read_at": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"order_id"?: string | null,"payload"?: NonNullable<Json>,"read_at"?: string | null,"type": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"order_id"?: string | null,"payload"?: NonNullable<Json>,"read_at"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"order_addons": {
                  Row: {
                    "addon_id": string | null,"id": string,"order_id": string,"price_minor": number,"title": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "addon_id"?: string | null,"id"?: string,"order_id": string,"price_minor": number,"title": NonNullable<Json>
                  }
                  Update: {
                    "addon_id"?: string | null,"id"?: string,"order_id"?: string,"price_minor"?: number,"title"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_addons_addon_id_fkey"
      columns: ["addon_id"]
isOneToOne: false
      referencedRelation: "service_addons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_addons_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_deliveries": {
                  Row: {
                    "delivered_at": string,"delivered_by": string | null,"id": string,"note": string | null,"order_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "delivered_at"?: string,"delivered_by"?: string | null,"id"?: string,"note"?: string | null,"order_id": string,"version": number
                  }
                  Update: {
                    "delivered_at"?: string,"delivered_by"?: string | null,"id"?: string,"note"?: string | null,"order_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_deliveries_delivered_by_fkey"
      columns: ["delivered_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_deliveries_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_events": {
                  Row: {
                    "actor_id": string | null,"actor_kind": Database["public"]['Enums']["actor_kind"],"created_at": string,"details": NonNullable<Json>,"from_status": Database["public"]['Enums']["order_status"] | null,"id": string,"order_id": string,"to_status": Database["public"]['Enums']["order_status"] | null,"type": string,"visibility": Database["public"]['Enums']["event_visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_kind": Database["public"]['Enums']["actor_kind"],"created_at"?: string,"details"?: NonNullable<Json>,"from_status"?: Database["public"]['Enums']["order_status"] | null,"id"?: string,"order_id": string,"to_status"?: Database["public"]['Enums']["order_status"] | null,"type": string,"visibility"?: Database["public"]['Enums']["event_visibility"]
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_kind"?: Database["public"]['Enums']["actor_kind"],"created_at"?: string,"details"?: NonNullable<Json>,"from_status"?: Database["public"]['Enums']["order_status"] | null,"id"?: string,"order_id"?: string,"to_status"?: Database["public"]['Enums']["order_status"] | null,"type"?: string,"visibility"?: Database["public"]['Enums']["event_visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_events_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_messages": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"order_id": string,"sender_id": string | null,"sender_kind": Database["public"]['Enums']["actor_kind"]
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"order_id": string,"sender_id"?: string | null,"sender_kind": Database["public"]['Enums']["actor_kind"]
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"order_id"?: string,"sender_id"?: string | null,"sender_kind"?: Database["public"]['Enums']["actor_kind"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_messages_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"order_notes": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"id": string,"order_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body": string,"created_at"?: string,"id"?: string,"order_id": string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"order_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_notes_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_notes_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "addons_total_minor": number,"assigned_lawyer_id": string | null,"base_price_minor": number,"cancel_reason": string | null,"cancelled_at": string | null,"completed_at": string | null,"created_at": string,"created_by": string,"currency": string,"customer_account_id": string,"delivered_at": string | null,"form_answers": NonNullable<Json>,"form_version_id": string,"id": string,"order_number": string,"paid_at": string | null,"payment_status": Database["public"]['Enums']["payment_status"],"quote_issued_at": string | null,"service_id": string,"service_snapshot": NonNullable<Json>,"status": Database["public"]['Enums']["order_status"],"total_minor": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "addons_total_minor"?: number,"assigned_lawyer_id"?: string | null,"base_price_minor": number,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by": string,"currency"?: string,"customer_account_id": string,"delivered_at"?: string | null,"form_answers"?: NonNullable<Json>,"form_version_id": string,"id"?: string,"order_number"?: string,"paid_at"?: string | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"quote_issued_at"?: string | null,"service_id": string,"service_snapshot": NonNullable<Json>,"status": Database["public"]['Enums']["order_status"],"total_minor": number,"updated_at"?: string
                  }
                  Update: {
                    "addons_total_minor"?: number,"assigned_lawyer_id"?: string | null,"base_price_minor"?: number,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string,"currency"?: string,"customer_account_id"?: string,"delivered_at"?: string | null,"form_answers"?: NonNullable<Json>,"form_version_id"?: string,"id"?: string,"order_number"?: string,"paid_at"?: string | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"quote_issued_at"?: string | null,"service_id"?: string,"service_snapshot"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["order_status"],"total_minor"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_assigned_lawyer_id_fkey"
      columns: ["assigned_lawyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_customer_account_id_fkey"
      columns: ["customer_account_id"]
isOneToOne: false
      referencedRelation: "customer_accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_form_version_id_fkey"
      columns: ["form_version_id"]
isOneToOne: false
      referencedRelation: "service_form_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_events": {
                  Row: {
                    "event_type": string,"id": string,"payload": NonNullable<Json>,"payment_id": string | null,"processed_at": string | null,"processing_result": string | null,"provider": string,"provider_event_id": string,"received_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "event_type": string,"id"?: string,"payload"?: NonNullable<Json>,"payment_id"?: string | null,"processed_at"?: string | null,"processing_result"?: string | null,"provider": string,"provider_event_id": string,"received_at"?: string
                  }
                  Update: {
                    "event_type"?: string,"id"?: string,"payload"?: NonNullable<Json>,"payment_id"?: string | null,"processed_at"?: string | null,"processing_result"?: string | null,"provider"?: string,"provider_event_id"?: string,"received_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_events_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_minor": number,"created_at": string,"created_by": string,"currency": string,"failed_at": string | null,"failure_reason": string | null,"id": string,"method": Database["public"]['Enums']["payment_method"],"order_id": string,"provider": string,"provider_reference": string | null,"receipt_number": string | null,"status": Database["public"]['Enums']["payment_attempt_status"],"succeeded_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"created_at"?: string,"created_by": string,"currency"?: string,"failed_at"?: string | null,"failure_reason"?: string | null,"id"?: string,"method": Database["public"]['Enums']["payment_method"],"order_id": string,"provider": string,"provider_reference"?: string | null,"receipt_number"?: string | null,"status"?: Database["public"]['Enums']["payment_attempt_status"],"succeeded_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"created_at"?: string,"created_by"?: string,"currency"?: string,"failed_at"?: string | null,"failure_reason"?: string | null,"id"?: string,"method"?: Database["public"]['Enums']["payment_method"],"order_id"?: string,"provider"?: string,"provider_reference"?: string | null,"receipt_number"?: string | null,"status"?: Database["public"]['Enums']["payment_attempt_status"],"succeeded_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"platform_settings": {
                  Row: {
                    "is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "platform_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string,"full_name": string,"id": string,"phone": string | null,"preferred_locale": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"full_name": string,"id": string,"phone"?: string | null,"preferred_locale"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"phone"?: string | null,"preferred_locale"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"refunds": {
                  Row: {
                    "amount_minor": number,"created_at": string,"id": string,"payment_id": string,"processed_at": string | null,"provider_reference": string | null,"reason": string | null,"requested_by": string | null,"status": Database["public"]['Enums']["refund_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"created_at"?: string,"id"?: string,"payment_id": string,"processed_at"?: string | null,"provider_reference"?: string | null,"reason"?: string | null,"requested_by"?: string | null,"status"?: Database["public"]['Enums']["refund_status"]
                  }
                  Update: {
                    "amount_minor"?: number,"created_at"?: string,"id"?: string,"payment_id"?: string,"processed_at"?: string | null,"provider_reference"?: string | null,"reason"?: string | null,"requested_by"?: string | null,"status"?: Database["public"]['Enums']["refund_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "refunds_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "refunds_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "author_id": string | null,"comment": string | null,"created_at": string,"display_name": string,"id": string,"is_published": boolean,"order_id": string,"rating": number,"replied_at": string | null,"replied_by": string | null,"reply": string | null,"service_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"comment"?: string | null,"created_at"?: string,"display_name": string,"id"?: string,"is_published"?: boolean,"order_id": string,"rating": number,"replied_at"?: string | null,"replied_by"?: string | null,"reply"?: string | null,"service_id": string
                  }
                  Update: {
                    "author_id"?: string | null,"comment"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string,"is_published"?: boolean,"order_id"?: string,"rating"?: number,"replied_at"?: string | null,"replied_by"?: string | null,"reply"?: string | null,"service_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_order_id_fkey"
      columns: ["order_id"]
isOneToOne: true
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_replied_by_fkey"
      columns: ["replied_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"revision_requests": {
                  Row: {
                    "created_at": string,"delivery_id": string,"id": string,"order_id": string,"reason": string,"requested_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"delivery_id": string,"id"?: string,"order_id": string,"reason": string,"requested_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"delivery_id"?: string,"id"?: string,"order_id"?: string,"reason"?: string,"requested_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "revision_requests_delivery_id_fkey"
      columns: ["delivery_id"]
isOneToOne: false
      referencedRelation: "order_deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "revision_requests_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "revision_requests_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"service_addons": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"price_minor": number,"service_id": string,"sort_order": number,"title": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"price_minor": number,"service_id": string,"sort_order"?: number,"title": NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"price_minor"?: number,"service_id"?: string,"sort_order"?: number,"title"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_addons_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"service_categories": {
                  Row: {
                    "created_at": string,"description": NonNullable<Json>,"icon": string,"id": string,"is_active": boolean,"slug": string,"sort_order": number,"title": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description": NonNullable<Json>,"icon"?: string,"id"?: string,"is_active"?: boolean,"slug": string,"sort_order"?: number,"title": NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: NonNullable<Json>,"icon"?: string,"id"?: string,"is_active"?: boolean,"slug"?: string,"sort_order"?: number,"title"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"service_category_links": {
                  Row: {
                    "category_id": string,"service_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"service_id": string
                  }
                  Update: {
                    "category_id"?: string,"service_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_category_links_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "service_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_category_links_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"service_form_versions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"fields": NonNullable<Json>,"id": string,"published_at": string | null,"service_id": string,"status": Database["public"]['Enums']["form_version_status"],"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"fields": NonNullable<Json>,"id"?: string,"published_at"?: string | null,"service_id": string,"status"?: Database["public"]['Enums']["form_version_status"],"version": number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"fields"?: NonNullable<Json>,"id"?: string,"published_at"?: string | null,"service_id"?: string,"status"?: Database["public"]['Enums']["form_version_status"],"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_form_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_form_versions_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"service_price_history": {
                  Row: {
                    "base_price_minor": number,"changed_at": string,"changed_by": string | null,"id": string,"pricing_type": Database["public"]['Enums']["pricing_type"],"service_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_price_minor": number,"changed_at"?: string,"changed_by"?: string | null,"id"?: string,"pricing_type": Database["public"]['Enums']["pricing_type"],"service_id": string
                  }
                  Update: {
                    "base_price_minor"?: number,"changed_at"?: string,"changed_by"?: string | null,"id"?: string,"pricing_type"?: Database["public"]['Enums']["pricing_type"],"service_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_price_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_price_history_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"service_sections": {
                  Row: {
                    "content": Json | null,"id": string,"is_enabled": boolean,"key": Database["public"]['Enums']["section_key"],"service_id": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content"?: Json | null,"id"?: string,"is_enabled"?: boolean,"key": Database["public"]['Enums']["section_key"],"service_id": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "content"?: Json | null,"id"?: string,"is_enabled"?: boolean,"key"?: Database["public"]['Enums']["section_key"],"service_id"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_sections_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"services": {
                  Row: {
                    "base_price_minor": number,"created_at": string,"created_by": string | null,"currency": string,"delivery_estimate": NonNullable<Json>,"id": string,"is_featured": boolean,"kind": Database["public"]['Enums']["service_kind"],"meeting_duration_minutes": number | null,"pricing_type": Database["public"]['Enums']["pricing_type"],"primary_category_id": string,"published_at": string | null,"published_form_version_id": string | null,"short_description": NonNullable<Json>,"slug": string,"sort_order": number,"status": Database["public"]['Enums']["publish_status"],"title": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_price_minor": number,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"delivery_estimate": NonNullable<Json>,"id"?: string,"is_featured"?: boolean,"kind"?: Database["public"]['Enums']["service_kind"],"meeting_duration_minutes"?: number | null,"pricing_type"?: Database["public"]['Enums']["pricing_type"],"primary_category_id": string,"published_at"?: string | null,"published_form_version_id"?: string | null,"short_description": NonNullable<Json>,"slug": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["publish_status"],"title": NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "base_price_minor"?: number,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"delivery_estimate"?: NonNullable<Json>,"id"?: string,"is_featured"?: boolean,"kind"?: Database["public"]['Enums']["service_kind"],"meeting_duration_minutes"?: number | null,"pricing_type"?: Database["public"]['Enums']["pricing_type"],"primary_category_id"?: string,"published_at"?: string | null,"published_form_version_id"?: string | null,"short_description"?: NonNullable<Json>,"slug"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["publish_status"],"title"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "services_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "services_primary_category_id_fkey"
      columns: ["primary_category_id"]
isOneToOne: false
      referencedRelation: "service_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "services_published_form_fk"
      columns: ["published_form_version_id"]
isOneToOne: false
      referencedRelation: "service_form_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "granted_at": string,"granted_by": string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "granted_at"?: string,"granted_by"?: string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "granted_at"?: string,"granted_by"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_add_availability_exception":
{ Args: { "p_actor": string,"p_date": string,"p_end": string,"p_reason": string,"p_start": string }; Returns: string
                           },
"admin_discard_form_draft":
{ Args: { "p_actor": string,"p_service": string }; Returns: undefined
                           },
"admin_publish_service":
{ Args: { "p_actor": string,"p_service": string }; Returns: Json
                           },
"admin_remove_availability_exception":
{ Args: { "p_actor": string,"p_id": string }; Returns: undefined
                           },
"admin_save_form_draft":
{ Args: { "p_actor": string,"p_fields": Json,"p_service": string }; Returns: string
                           },
"admin_save_service":
{ Args: { "p_actor": string,"p_data": Json,"p_service": string }; Returns: string
                           },
"admin_set_availability_rules":
{ Args: { "p_actor": string,"p_rules": Json }; Returns: undefined
                           },
"admin_set_service_status":
{ Args: { "p_actor": string,"p_service": string,"p_status": Database["public"]['Enums']["publish_status"] }; Returns: undefined
                           },
"admin_set_setting":
{ Args: { "p_actor": string,"p_key": string,"p_value": Json }; Returns: undefined
                           },
"admin_set_user_role":
{ Args: { "p_actor": string,"p_display_name"?: string,"p_grant": boolean,"p_role": Database["public"]['Enums']["app_role"],"p_user": string }; Returns: undefined
                           },
"admin_update_prices":
{ Args: { "p_actor": string,"p_prices": Json }; Returns: number
                           },
"available_slots":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "is_available": boolean,"slot_end": string,"slot_start": string
            }[]
                           },
"booking_reschedule":
{ Args: { "p_actor": string,"p_new_start": string,"p_order": string }; Returns: undefined
                           },
"booking_set_meeting_link":
{ Args: { "p_actor": string,"p_order": string,"p_url": string }; Returns: undefined
                           },
"dashboard_kpis":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"document_mark_ready":
{ Args: { "p_actor": string,"p_document": string,"p_size_bytes": number }; Returns: undefined
                           },
"document_register_upload":
{ Args: { "p_actor": string,"p_extension": string,"p_form_field_id": string,"p_kind": Database["public"]['Enums']["document_kind"],"p_mime_type": string,"p_order": string,"p_original_name": string,"p_size_bytes": number,"p_storage_path": string }; Returns: string
                           },
"order_accept_delivery":
{ Args: { "p_actor": string,"p_order": string }; Returns: undefined
                           },
"order_add_note":
{ Args: { "p_actor": string,"p_body": string,"p_order": string }; Returns: string
                           },
"order_assign_lawyer":
{ Args: { "p_actor": string,"p_lawyer": string,"p_order": string }; Returns: undefined
                           },
"order_cancel":
{ Args: { "p_actor": string,"p_order": string,"p_reason": string }; Returns: undefined
                           },
"order_change_status":
{ Args: { "p_actor": string,"p_note"?: string,"p_order": string,"p_to": Database["public"]['Enums']["order_status"] }; Returns: Database["public"]['Enums']["order_status"]
                           },
"order_create":
{ Args: { "p_actor": string,"p_addon_ids": (string)[],"p_answers": Json,"p_document_ids": (string)[],"p_form_version": string,"p_service": string,"p_slot_start": string }; Returns: Json
                           },
"order_deliver":
{ Args: { "p_actor": string,"p_document_ids": (string)[],"p_note": string,"p_order": string }; Returns: number
                           },
"order_issue_quote":
{ Args: { "p_actor": string,"p_amount_minor": number,"p_note": string,"p_order": string }; Returns: undefined
                           },
"order_publish_response":
{ Args: { "p_actor": string,"p_body": string,"p_document_ids": (string)[],"p_order": string }; Returns: number
                           },
"order_request_info":
{ Args: { "p_actor": string,"p_message": string,"p_order": string }; Returns: undefined
                           },
"order_request_revision":
{ Args: { "p_actor": string,"p_order": string,"p_reason": string }; Returns: undefined
                           },
"order_send_message":
{ Args: { "p_actor": string,"p_body": string,"p_document_ids": (string)[],"p_order": string }; Returns: string
                           },
"payment_attach_reference":
{ Args: { "p_payment": string,"p_reference": string }; Returns: undefined
                           },
"payment_record_result":
{ Args: { "p_amount_minor": number,"p_event_id": string,"p_event_type": string,"p_failure_reason": string,"p_payload": Json,"p_payment": string,"p_provider": string,"p_success": boolean }; Returns: string
                           },
"payment_start":
{ Args: { "p_actor": string,"p_method": Database["public"]['Enums']["payment_method"],"p_order": string,"p_provider": string }; Returns: Json
                           },
"review_reply":
{ Args: { "p_actor": string,"p_reply": string,"p_review": string }; Returns: undefined
                           },
"review_submit":
{ Args: { "p_actor": string,"p_comment": string,"p_order": string,"p_rating": number }; Returns: string
                           },
"service_ratings":
{ Args: Record<PropertyKey, never>; Returns: {
              "avg_rating": number,"review_count": number,"service_id": string
            }[]
                           }
          }
          Enums: {
            "account_kind": "individual"|"company","actor_kind": "customer"|"lawyer"|"admin"|"system","app_role": "customer"|"lawyer"|"admin","booking_status": "held"|"confirmed"|"completed"|"cancelled"|"expired","document_kind": "customer_upload"|"deliverable"|"consultation_response"|"message_attachment","document_status": "pending"|"ready","event_visibility": "customer"|"staff","form_version_status": "draft"|"published"|"retired","member_role": "owner"|"member","order_status": "new"|"awaiting_payment"|"under_review"|"awaiting_info"|"in_progress"|"revision"|"delivered"|"completed"|"cancelled","payment_attempt_status": "initiated"|"pending"|"succeeded"|"failed"|"expired"|"cancelled","payment_method": "card"|"wallet"|"fawry","payment_status": "unpaid"|"failed"|"paid"|"refunded"|"partially_refunded","pricing_type": "fixed"|"quote","publish_status": "draft"|"published"|"archived","refund_status": "requested"|"succeeded"|"failed","section_key": "about"|"who"|"included"|"deliverables"|"docs"|"steps"|"duration"|"pricing"|"faq"|"reviews","service_kind": "standard"|"written_consultation"|"video_consultation"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "account_kind": ["individual", "company"],"actor_kind": ["customer", "lawyer", "admin", "system"],"app_role": ["customer", "lawyer", "admin"],"booking_status": ["held", "confirmed", "completed", "cancelled", "expired"],"document_kind": ["customer_upload", "deliverable", "consultation_response", "message_attachment"],"document_status": ["pending", "ready"],"event_visibility": ["customer", "staff"],"form_version_status": ["draft", "published", "retired"],"member_role": ["owner", "member"],"order_status": ["new", "awaiting_payment", "under_review", "awaiting_info", "in_progress", "revision", "delivered", "completed", "cancelled"],"payment_attempt_status": ["initiated", "pending", "succeeded", "failed", "expired", "cancelled"],"payment_method": ["card", "wallet", "fawry"],"payment_status": ["unpaid", "failed", "paid", "refunded", "partially_refunded"],"pricing_type": ["fixed", "quote"],"publish_status": ["draft", "published", "archived"],"refund_status": ["requested", "succeeded", "failed"],"section_key": ["about", "who", "included", "deliverables", "docs", "steps", "duration", "pricing", "faq", "reviews"],"service_kind": ["standard", "written_consultation", "video_consultation"]
          }
        }
} as const

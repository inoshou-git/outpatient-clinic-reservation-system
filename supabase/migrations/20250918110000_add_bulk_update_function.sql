CREATE OR REPLACE FUNCTION bulk_update_consultations(
    p_ids int[],
    p_new_consultations text[],
    p_last_updated_by text
)
RETURNS SETOF appointments AS $$
DECLARE
    updated_id int;
    updated_record appointments;
    updated_records appointments[] := '{}';
BEGIN
    FOREACH updated_id IN ARRAY p_ids
    LOOP
        UPDATE appointments
        SET
            consultation = COALESCE(
                (
                    SELECT string_agg(DISTINCT item, ', ')
                    FROM (
                        SELECT trim(unnest(string_to_array(COALESCE(consultation, ''), ','))) AS item
                        UNION
                        SELECT unnest(p_new_consultations)
                    ) AS combined
                    WHERE item <> ''
                ),
                '' -- string_agg が NULL を返した場合に空文字列を返す
            ),
            "lastUpdatedBy" = p_last_updated_by,
            "lastUpdatedAt" = now()
        WHERE id = updated_id
        RETURNING * INTO updated_record;
        updated_records := array_append(updated_records, updated_record);
    END LOOP;

    RETURN QUERY SELECT * FROM unnest(updated_records);
END;
$$ LANGUAGE plpgsql;
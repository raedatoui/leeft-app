#!/bin/bash

upload_compressed_log() {
    local input_file="$1"
    local timestamp="$2"
    local gsc_path="$3"

    # Extract the base filename without extension
    local base_name=$(basename "$input_file" .json)
    local compressed_log="${base_name}_${timestamp}.json.gz"
    local output_dir=$(dirname "$input_file")

    # Check if input file exists
    if [ ! -f "$input_file" ]; then
        echo "Error: Input file '$input_file' not found"
        return 1
    fi

    echo "Compressing $input_file to $compressed_log..."
    gzip -c "$input_file" > "${output_dir}/${compressed_log}"

    if [ $? -ne 0 ]; then
        echo "Error: Compression failed"
        rm -f "${output_dir}/${compressed_log}"
        return 1
    fi

    echo "Uploading to Google Cloud Storage..."
    gsutil -h "Content-Type:application/json" -h "Content-Encoding:gzip" cp "${output_dir}/${compressed_log}" "${gsc_path}${compressed_log}"

    if [ $? -eq 0 ]; then
        echo "Successfully uploaded to ${gsc_path}${compressed_log}"
        rm -f "${output_dir}/${compressed_log}"
        return 0
    else
        echo "Error: Upload failed"
        rm -f "${output_dir}/${compressed_log}"
        return 1
    fi
}

gsc_path="gs://typedef/leeft/"
timestamp=${1:-$(date +"%Y%m%d_%H%M%S")}

upload_compressed_log "apps/data/data/out/lifting-log.json" "$timestamp" "$gsc_path"
upload_compressed_log "apps/data/data/out/cardio-log.json" "$timestamp" "$gsc_path"
upload_compressed_log "apps/data/data/out/cardio-log-strict.json" "$timestamp" "$gsc_path"
upload_compressed_log "apps/data/data/out/all-workouts-log.json" "$timestamp" "$gsc_path"
upload_compressed_log "apps/data/data/out/all-workouts-log-strict.json" "$timestamp" "$gsc_path"
upload_compressed_log "apps/data/data/out/cycles-lifting.json" "$timestamp" "$gsc_path"
upload_compressed_log "apps/data/data/out/cycles-all-workouts.json" "$timestamp" "$gsc_path"
upload_compressed_log "apps/data/data/exercise-classified.json" "$timestamp" "$gsc_path"

# Update .env.local
env_file="apps/web/.env.local"
if [ -f "$env_file" ]; then
    sed "s/^NEXT_PUBLIC_TIMESTAMP=.*/NEXT_PUBLIC_TIMESTAMP=${timestamp}/" "$env_file" > "${env_file}.tmp" && mv "${env_file}.tmp" "$env_file"
    echo "Updated NEXT_PUBLIC_TIMESTAMP in $env_file to $timestamp"
fi

echo $timestamp

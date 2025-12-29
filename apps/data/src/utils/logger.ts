export const logger = {
    // Core actions
    loading: (message: string) => console.log(`📥 ${message}`),
    loaded: (message: string) => console.log(`✅ ${message}`),
    saving: (message: string) => console.log(`💾 ${message}`),
    saved: (message: string) => console.log(`✅ ${message}`),
    processing: (message: string) => console.log(`⚙️  ${message}`),
    processed: (message: string) => console.log(`✅ ${message}`),

    // Data operations
    filtering: (message: string) => console.log(`🔍 ${message}`),
    filtered: (message: string) => console.log(`✅ ${message}`),
    combining: (message: string) => console.log(`🔗 ${message}`),
    combined: (message: string) => console.log(`✅ ${message}`),
    compiling: (message: string) => console.log(`⚡ ${message}`),
    compiled: (message: string) => console.log(`✅ ${message}`),
    converting: (message: string) => console.log(`🔄 ${message}`),
    converted: (message: string) => console.log(`✅ ${message}`),

    // Network/API
    downloading: (message: string) => console.log(`⬇️  ${message}`),
    downloaded: (message: string) => console.log(`✅ ${message}`),
    uploading: (message: string) => console.log(`⬆️  ${message}`),
    uploaded: (message: string) => console.log(`✅ ${message}`),
    fetching: (message: string) => console.log(`🌐 ${message}`),
    fetched: (message: string) => console.log(`✅ ${message}`),

    // Analysis
    analyzing: (message: string) => console.log(`🔬 ${message}`),
    analyzed: (message: string) => console.log(`✅ ${message}`),
    classifying: (message: string) => console.log(`🏷️  ${message}`),
    classified: (message: string) => console.log(`✅ ${message}`),

    // Results/stats
    info: (message: string) => console.log(`ℹ️  ${message}`),
    stats: (message: string) => console.log(`📊 ${message}`),
    summary: (message: string) => console.log(`📋 ${message}`),
    count: (message: string) => console.log(`🔢 ${message}`),
    breakdown: (message: string) => console.log(`📈 ${message}`),

    // Status
    success: (message: string) => console.log(`🎉 ${message}`),
    warning: (message: string | unknown) => console.log(`⚠️  ${message}`),
    error: (message: string | unknown) => console.log(`❌ ${message}`),

    // Files
    reading: (message: string) => console.log(`📖 ${message}`),
    writing: (message: string) => console.log(`📝 ${message}`),
    created: (message: string) => console.log(`📄 ${message}`),

    // Fitness specific
    workouts: (message: string) => console.log(`💪 ${message}`),
    cardio: (message: string) => console.log(`🏃 ${message}`),
    lifting: (message: string) => console.log(`🏋️  ${message}`),
    cycles: (message: string) => console.log(`🔄 ${message}`),

    // Time/dates
    dateRange: (message: string) => console.log(`📅 ${message}`),

    // Generic
    start: (message: string) => console.log(`🚀 ${message}`),
    complete: (message: string) => console.log(`🏁 ${message}`),
};

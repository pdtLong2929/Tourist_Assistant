/* global use, db */
// MongoDB Playground

const database = 'smart_travel_system';

// Tạo database
use(database);

// ==============================
// 1. destination_scoring_results
// ==============================
db.createCollection('destination_scoring_results', {
	validator: {
		$jsonSchema: {
			bsonType: 'object',
			required: [
				'requestId',
				'destinationId',
				'timeSlot',
				'scores',
				'createdAt'
			],
			properties: {
				requestId: {
					bsonType: 'string',
					description: 'Mã request chấm điểm'
				},
				userId: {
					bsonType: ['long', 'int', 'null'],
					description: 'ID người dùng'
				},
				destinationId: {
					bsonType: ['long', 'int'],
					description: 'ID điểm đến'
				},
				timeSlot: {
					bsonType: 'date',
					description: 'Mốc thời gian chấm điểm'
				},
				input: {
					bsonType: 'object',
					properties: {
						budget: { bsonType: ['double', 'int', 'long', 'decimal', 'null'] },
						groupSize: { bsonType: ['int', 'long', 'null'] },
						weather: { bsonType: ['string', 'null'] },
						preferences: {
							bsonType: ['array', 'null'],
							items: { bsonType: 'string' }
						}
					}
				},
				scores: {
					bsonType: 'object',
					required: ['overallScore'],
					properties: {
						costScore: { bsonType: ['double', 'int', 'long', 'decimal', 'null'] },
						experienceScore: { bsonType: ['double', 'int', 'long', 'decimal', 'null'] },
						trafficScore: { bsonType: ['double', 'int', 'long', 'decimal', 'null'] },
						safetyScore: { bsonType: ['double', 'int', 'long', 'decimal', 'null'] },
						overallScore: { bsonType: ['double', 'int', 'long', 'decimal'] }
					}
				},
				explanation: {
					bsonType: ['array', 'null'],
					items: { bsonType: 'string' }
				},
				model: {
					bsonType: ['object', 'null'],
					properties: {
						provider: { bsonType: ['string', 'null'] },
						modelName: { bsonType: ['string', 'null'] },
						version: { bsonType: ['string', 'null'] }
					}
				},
				createdAt: {
					bsonType: 'date'
				}
			}
		}
	}
});

// ==============================
// 2. ai_requests
// ==============================
db.createCollection('ai_requests', {
	validator: {
		$jsonSchema: {
			bsonType: 'object',
			required: ['requestId', 'service', 'type', 'status', 'createdAt'],
			properties: {
				requestId: { bsonType: 'string' },
				service: { bsonType: 'string' },
				type: { bsonType: 'string' },
				userId: { bsonType: ['long', 'int', 'null'] },
				payload: { bsonType: ['object', 'null'] },
				status: { bsonType: 'string' },
				latencyMs: { bsonType: ['int', 'long', 'double', 'null'] },
				createdAt: { bsonType: 'date' }
			}
		}
	}
});

// ==============================
// 3. ai_prompt_logs
// ==============================
db.createCollection('ai_prompt_logs', {
	validator: {
		$jsonSchema: {
			bsonType: 'object',
			required: ['requestId', 'provider', 'createdAt'],
			properties: {
				requestId: { bsonType: 'string' },
				provider: { bsonType: 'string' },
				promptTemplate: { bsonType: ['string', 'null'] },
				contextDocs: {
					bsonType: ['array', 'null'],
					items: {
						bsonType: 'object',
						properties: {
							source: { bsonType: ['string', 'null'] },
							id: { bsonType: ['string', 'null'] }
						}
					}
				},
				promptText: { bsonType: ['string', 'null'] },
				responseText: { bsonType: ['string', 'null'] },
				tokenUsage: {
					bsonType: ['object', 'null'],
					properties: {
						input: { bsonType: ['int', 'long', 'null'] },
						output: { bsonType: ['int', 'long', 'null'] }
					}
				},
				createdAt: { bsonType: 'date' }
			}
		}
	}
});

// ==============================
// 4. search_cache_snapshots
// ==============================
db.createCollection('search_cache_snapshots', {
	validator: {
		$jsonSchema: {
			bsonType: 'object',
			required: ['cacheKey', 'destinationId', 'timeSlot', 'response', 'expiresAt', 'createdAt'],
			properties: {
				cacheKey: { bsonType: 'string' },
				destinationId: { bsonType: ['long', 'int'] },
				timeSlot: { bsonType: 'date' },
				response: { bsonType: 'object' },
				expiresAt: { bsonType: 'date' },
				createdAt: { bsonType: 'date' }
			}
		}
	}
});

// ==============================
// 5. event_logs
// ==============================
db.createCollection('event_logs', {
	validator: {
		$jsonSchema: {
			bsonType: 'object',
			required: ['eventType', 'publishedAt', 'source'],
			properties: {
				eventType: { bsonType: 'string' },
				aggregateType: { bsonType: ['string', 'null'] },
				aggregateId: { bsonType: ['long', 'int', 'string', 'null'] },
				payload: { bsonType: ['object', 'null'] },
				publishedAt: { bsonType: 'date' },
				source: { bsonType: 'string' }
			}
		}
	}
});

// ==============================
// 6. user_behavior_profiles
// ==============================
db.createCollection('user_behavior_profiles', {
	validator: {
		$jsonSchema: {
			bsonType: 'object',
			required: ['userId', 'updatedAt'],
			properties: {
				userId: { bsonType: ['long', 'int'] },
				preferences: {
					bsonType: ['object', 'null'],
					properties: {
						budgetLevel: { bsonType: ['string', 'null'] },
						tripStyle: {
							bsonType: ['array', 'null'],
							items: { bsonType: 'string' }
						},
						vehiclePreference: {
							bsonType: ['array', 'null'],
							items: { bsonType: 'string' }
						}
					}
				},
				stats: {
					bsonType: ['object', 'null'],
					properties: {
						avgBookingValue: { bsonType: ['double', 'int', 'long', 'decimal', 'null'] },
						avgTripDurationHours: { bsonType: ['double', 'int', 'long', 'decimal', 'null'] },
						mostBookedProvince: { bsonType: ['string', 'null'] }
					}
				},
				updatedAt: { bsonType: 'date' }
			}
		}
	}
});

// ==============================
// INDEXES
// ==============================

db.destination_scoring_results.createIndex({ requestId: 1 }, { unique: true });
db.destination_scoring_results.createIndex({ destinationId: 1, timeSlot: 1 });
db.destination_scoring_results.createIndex({ userId: 1, createdAt: -1 });

db.ai_requests.createIndex({ requestId: 1 }, { unique: true });
db.ai_requests.createIndex({ userId: 1, createdAt: -1 });
db.ai_requests.createIndex({ type: 1, status: 1 });

db.ai_prompt_logs.createIndex({ requestId: 1 });
db.ai_prompt_logs.createIndex({ provider: 1, createdAt: -1 });

db.search_cache_snapshots.createIndex({ cacheKey: 1 }, { unique: true });
db.search_cache_snapshots.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

db.event_logs.createIndex({ eventType: 1, publishedAt: -1 });
db.event_logs.createIndex({ aggregateType: 1, aggregateId: 1 });

db.user_behavior_profiles.createIndex({ userId: 1 }, { unique: true });

// ==============================
// SAMPLE DATA
// ==============================

db.destination_scoring_results.insertOne({
	requestId: 'score_req_001',
	userId: 15,
	destinationId: 901,
	timeSlot: new Date('2026-04-01T18:00:00+07:00'),
	input: {
		budget: 800000,
		groupSize: 2,
		weather: 'clear',
		preferences: ['view đẹp', 'ít đông', 'giá vừa']
	},
	scores: {
		costScore: 8.4,
		experienceScore: 8.8,
		trafficScore: 7.1,
		safetyScore: 8.0,
		overallScore: 8.2
	},
	explanation: [
		'phù hợp ngân sách',
		'thời tiết thuận lợi',
		'di chuyển tương đối tốt'
	],
	model: {
		provider: 'gpt',
		modelName: 'gpt-x',
		version: '2026-04'
	},
	createdAt: new Date()
});

db.ai_requests.insertOne({
	requestId: 'score_req_001',
	service: 'ai-orchestrator',
	type: 'destination_scoring',
	userId: 15,
	payload: {
		destinationId: 901,
		timeSlot: '2026-04-01T18:00:00+07:00'
	},
	status: 'SUCCESS',
	latencyMs: 1840,
	createdAt: new Date()
});

db.ai_prompt_logs.insertOne({
	requestId: 'score_req_001',
	provider: 'gemini',
	promptTemplate: 'destination-score-v2',
	contextDocs: [
		{ source: 'weather_api', id: 'w_11' },
		{ source: 'traffic_api', id: 't_39' }
	],
	promptText: 'Evaluate this destination based on cost, traffic, experience.',
	responseText: 'Destination is suitable due to weather and acceptable traffic.',
	tokenUsage: {
		input: 1200,
		output: 350
	},
	createdAt: new Date()
});

db.search_cache_snapshots.insertOne({
	cacheKey: 'score:destination:901:202604011800',
	destinationId: 901,
	timeSlot: new Date('2026-04-01T18:00:00+07:00'),
	response: {
		overallScore: 8.2,
		topReasons: ['thời tiết tốt', 'chi phí ổn', 'ít ùn tắc']
	},
	expiresAt: new Date(Date.now() + 30 * 60 * 1000),
	createdAt: new Date()
});

db.event_logs.insertOne({
	eventType: 'BOOKING_EXPIRED',
	aggregateType: 'booking',
	aggregateId: 5012,
	payload: {
		vehicleId: 101,
		userId: 15
	},
	publishedAt: new Date(),
	source: 'booking-service'
});

db.user_behavior_profiles.insertOne({
	userId: 15,
	preferences: {
		budgetLevel: 'medium',
		tripStyle: ['short-trip', 'weekend'],
		vehiclePreference: ['car', 'self-drive']
	},
	stats: {
		avgBookingValue: 920000,
		avgTripDurationHours: 9.5,
		mostBookedProvince: 'Lâm Đồng'
	},
	updatedAt: new Date()
});
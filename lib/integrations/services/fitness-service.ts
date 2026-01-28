/**
 * Fitness Integration Services
 *
 * Provides comprehensive API access for:
 * - Strava (activities, athletes, segments)
 * - Fitbit (activities, sleep, heart rate, nutrition)
 * - Garmin (activities, wellness, body composition)
 */

import { BaseIntegrationService, ApiError } from './base-service';

// ============================================================================
// STRAVA SERVICE
// ============================================================================

export interface StravaAthlete {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  bio: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  premium: boolean;
  summit: boolean;
  created_at: string;
  updated_at: string;
  profile: string;
  profile_medium: string;
  follower_count: number;
  friend_count: number;
  weight: number;
  ftp: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  start_latlng: [number, number];
  end_latlng: [number, number];
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map: {
    id: string;
    summary_polyline: string;
    resource_state: number;
  };
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  visibility: string;
  flagged: boolean;
  gear_id: string;
  average_speed: number;
  max_speed: number;
  average_cadence: number;
  average_watts: number;
  weighted_average_watts: number;
  kilojoules: number;
  device_watts: boolean;
  has_heartrate: boolean;
  average_heartrate: number;
  max_heartrate: number;
  heartrate_opt_out: boolean;
  suffer_score: number;
  calories: number;
}

export interface StravaActivityStats {
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
  recent_ride_totals: StravaTotals;
  recent_run_totals: StravaTotals;
  recent_swim_totals: StravaTotals;
  ytd_ride_totals: StravaTotals;
  ytd_run_totals: StravaTotals;
  ytd_swim_totals: StravaTotals;
  all_ride_totals: StravaTotals;
  all_run_totals: StravaTotals;
  all_swim_totals: StravaTotals;
}

export interface StravaTotals {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
  achievement_count: number;
}

export interface StravaGear {
  id: string;
  primary: boolean;
  name: string;
  nickname: string;
  resource_state: number;
  retired: boolean;
  distance: number;
  converted_distance: number;
}

export interface StravaSegment {
  id: number;
  name: string;
  activity_type: string;
  distance: number;
  average_grade: number;
  maximum_grade: number;
  elevation_high: number;
  elevation_low: number;
  start_latlng: [number, number];
  end_latlng: [number, number];
  climb_category: number;
  city: string;
  state: string;
  country: string;
  private: boolean;
  starred: boolean;
  created_at: string;
  updated_at: string;
  total_elevation_gain: number;
  map: {
    id: string;
    polyline: string;
    resource_state: number;
  };
  effort_count: number;
  athlete_count: number;
  hazardous: boolean;
  star_count: number;
}

class StravaService extends BaseIntegrationService {
  constructor() {
    super('strava', 'https://www.strava.com/api/v3');
  }

  protected parsePaginatedResponse<T>(response: any): { items: T[]; nextCursor?: string } {
    // Strava returns arrays directly, pagination is handled via page parameter
    return {
      items: Array.isArray(response) ? response : [],
      nextCursor: undefined,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.getAthlete(userId);
      return true;
    } catch {
      return false;
    }
  }

  // ============ Athlete API ============

  async getAthlete(userId: string): Promise<StravaAthlete> {
    return this.request(userId, '/athlete');
  }

  async getAthleteStats(userId: string, athleteId: number): Promise<StravaActivityStats> {
    return this.request(userId, `/athletes/${athleteId}/stats`);
  }

  async updateAthlete(
    userId: string,
    data: { weight?: number; }
  ): Promise<StravaAthlete> {
    return this.request(userId, '/athlete', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ============ Activities API ============

  async listActivities(
    userId: string,
    options: {
      before?: number;
      after?: number;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<StravaActivity[]> {
    const params = new URLSearchParams();
    if (options.before) params.set('before', options.before.toString());
    if (options.after) params.set('after', options.after.toString());
    if (options.page) params.set('page', options.page.toString());
    params.set('per_page', (options.per_page || 30).toString());

    return this.request(userId, `/athlete/activities?${params.toString()}`);
  }

  async getActivity(userId: string, activityId: number, includeAllEfforts = false): Promise<StravaActivity> {
    const params = includeAllEfforts ? '?include_all_efforts=true' : '';
    return this.request(userId, `/activities/${activityId}${params}`);
  }

  async createActivity(
    userId: string,
    activity: {
      name: string;
      sport_type: string;
      start_date_local: string;
      elapsed_time: number;
      type?: string;
      description?: string;
      distance?: number;
      trainer?: boolean;
      commute?: boolean;
    }
  ): Promise<StravaActivity> {
    return this.request(userId, '/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  }

  async updateActivity(
    userId: string,
    activityId: number,
    data: {
      name?: string;
      sport_type?: string;
      description?: string;
      trainer?: boolean;
      commute?: boolean;
      hide_from_home?: boolean;
      gear_id?: string;
    }
  ): Promise<StravaActivity> {
    return this.request(userId, `/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteActivity(userId: string, activityId: number): Promise<void> {
    await this.request(userId, `/activities/${activityId}`, {
      method: 'DELETE',
    });
  }

  async getActivityLaps(userId: string, activityId: number): Promise<any[]> {
    return this.request(userId, `/activities/${activityId}/laps`);
  }

  async getActivityZones(userId: string, activityId: number): Promise<any[]> {
    return this.request(userId, `/activities/${activityId}/zones`);
  }

  async getActivityComments(
    userId: string,
    activityId: number,
    options: { page?: number; per_page?: number } = {}
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (options.page) params.set('page', options.page.toString());
    params.set('per_page', (options.per_page || 30).toString());

    return this.request(userId, `/activities/${activityId}/comments?${params.toString()}`);
  }

  async getActivityKudos(
    userId: string,
    activityId: number,
    options: { page?: number; per_page?: number } = {}
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (options.page) params.set('page', options.page.toString());
    params.set('per_page', (options.per_page || 30).toString());

    return this.request(userId, `/activities/${activityId}/kudos?${params.toString()}`);
  }

  // ============ Gear API ============

  async getGear(userId: string, gearId: string): Promise<StravaGear> {
    return this.request(userId, `/gear/${gearId}`);
  }

  // ============ Segments API ============

  async getSegment(userId: string, segmentId: number): Promise<StravaSegment> {
    return this.request(userId, `/segments/${segmentId}`);
  }

  async starSegment(userId: string, segmentId: number, starred: boolean): Promise<StravaSegment> {
    return this.request(userId, `/segments/${segmentId}/starred`, {
      method: 'PUT',
      body: JSON.stringify({ starred }),
    });
  }

  async getStarredSegments(
    userId: string,
    options: { page?: number; per_page?: number } = {}
  ): Promise<StravaSegment[]> {
    const params = new URLSearchParams();
    if (options.page) params.set('page', options.page.toString());
    params.set('per_page', (options.per_page || 30).toString());

    return this.request(userId, `/segments/starred?${params.toString()}`);
  }

  async exploreSegments(
    userId: string,
    bounds: [number, number, number, number],
    activityType?: 'running' | 'riding'
  ): Promise<{ segments: StravaSegment[] }> {
    const params = new URLSearchParams();
    params.set('bounds', bounds.join(','));
    if (activityType) params.set('activity_type', activityType);

    return this.request(userId, `/segments/explore?${params.toString()}`);
  }

  // ============ Routes API ============

  async listRoutes(
    userId: string,
    options: { page?: number; per_page?: number } = {}
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (options.page) params.set('page', options.page.toString());
    params.set('per_page', (options.per_page || 30).toString());

    return this.request(userId, `/athlete/routes?${params.toString()}`);
  }

  async getRoute(userId: string, routeId: number): Promise<any> {
    return this.request(userId, `/routes/${routeId}`);
  }

  // ============ Clubs API ============

  async listClubs(
    userId: string,
    options: { page?: number; per_page?: number } = {}
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (options.page) params.set('page', options.page.toString());
    params.set('per_page', (options.per_page || 30).toString());

    return this.request(userId, `/athlete/clubs?${params.toString()}`);
  }

  async getClub(userId: string, clubId: number): Promise<any> {
    return this.request(userId, `/clubs/${clubId}`);
  }

  async getClubActivities(
    userId: string,
    clubId: number,
    options: { page?: number; per_page?: number } = {}
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (options.page) params.set('page', options.page.toString());
    params.set('per_page', (options.per_page || 30).toString());

    return this.request(userId, `/clubs/${clubId}/activities?${params.toString()}`);
  }

  async getClubMembers(
    userId: string,
    clubId: number,
    options: { page?: number; per_page?: number } = {}
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (options.page) params.set('page', options.page.toString());
    params.set('per_page', (options.per_page || 30).toString());

    return this.request(userId, `/clubs/${clubId}/members?${params.toString()}`);
  }
}

// ============================================================================
// FITBIT SERVICE
// ============================================================================

export interface FitbitProfile {
  user: {
    aboutMe: string;
    age: number;
    avatar: string;
    avatar150: string;
    avatar640: string;
    city: string;
    country: string;
    dateOfBirth: string;
    displayName: string;
    displayNameSetting: string;
    encodedId: string;
    firstName: string;
    fullName: string;
    gender: string;
    height: number;
    heightUnit: string;
    lastName: string;
    locale: string;
    memberSince: string;
    offsetFromUTCMillis: number;
    state: string;
    strideLengthRunning: number;
    strideLengthRunningType: string;
    strideLengthWalking: number;
    strideLengthWalkingType: string;
    timezone: string;
    weight: number;
    weightUnit: string;
  };
}

export interface FitbitActivitySummary {
  activities: FitbitActivity[];
  goals: {
    activeMinutes: number;
    caloriesOut: number;
    distance: number;
    floors: number;
    steps: number;
  };
  summary: {
    activeScore: number;
    activityCalories: number;
    caloriesBMR: number;
    caloriesOut: number;
    distances: Array<{ activity: string; distance: number }>;
    elevation: number;
    fairlyActiveMinutes: number;
    floors: number;
    heartRateZones: Array<{
      caloriesOut: number;
      max: number;
      min: number;
      minutes: number;
      name: string;
    }>;
    lightlyActiveMinutes: number;
    marginalCalories: number;
    restingHeartRate: number;
    sedentaryMinutes: number;
    steps: number;
    veryActiveMinutes: number;
  };
}

export interface FitbitActivity {
  activityId: number;
  activityParentId: number;
  activityParentName: string;
  calories: number;
  description: string;
  distance: number;
  duration: number;
  hasActiveZoneMinutes: boolean;
  hasStartTime: boolean;
  isFavorite: boolean;
  lastModified: string;
  logId: number;
  name: string;
  startDate: string;
  startTime: string;
  steps: number;
}

export interface FitbitSleepLog {
  dateOfSleep: string;
  duration: number;
  efficiency: number;
  endTime: string;
  infoCode: number;
  isMainSleep: boolean;
  levels: {
    data: Array<{
      dateTime: string;
      level: string;
      seconds: number;
    }>;
    shortData: Array<{
      dateTime: string;
      level: string;
      seconds: number;
    }>;
    summary: {
      deep: { count: number; minutes: number; thirtyDayAvgMinutes: number };
      light: { count: number; minutes: number; thirtyDayAvgMinutes: number };
      rem: { count: number; minutes: number; thirtyDayAvgMinutes: number };
      wake: { count: number; minutes: number; thirtyDayAvgMinutes: number };
    };
  };
  logId: number;
  logType: string;
  minutesAfterWakeup: number;
  minutesAsleep: number;
  minutesAwake: number;
  minutesToFallAsleep: number;
  startTime: string;
  timeInBed: number;
  type: string;
}

export interface FitbitHeartRate {
  'activities-heart': Array<{
    dateTime: string;
    value: {
      customHeartRateZones: any[];
      heartRateZones: Array<{
        caloriesOut: number;
        max: number;
        min: number;
        minutes: number;
        name: string;
      }>;
      restingHeartRate: number;
    };
  }>;
  'activities-heart-intraday'?: {
    dataset: Array<{
      time: string;
      value: number;
    }>;
    datasetInterval: number;
    datasetType: string;
  };
}

export interface FitbitFood {
  foods: Array<{
    isFavorite: boolean;
    logDate: string;
    logId: number;
    loggedFood: {
      accessLevel: string;
      amount: number;
      brand: string;
      calories: number;
      foodId: number;
      locale: string;
      mealTypeId: number;
      name: string;
      unit: { id: number; name: string; plural: string };
      units: number[];
    };
    nutritionalValues: {
      calories: number;
      carbs: number;
      fat: number;
      fiber: number;
      protein: number;
      sodium: number;
    };
  }>;
  goals: {
    calories: number;
  };
  summary: {
    calories: number;
    carbs: number;
    fat: number;
    fiber: number;
    protein: number;
    sodium: number;
    water: number;
  };
}

export interface FitbitWeight {
  weight: Array<{
    bmi: number;
    date: string;
    fat: number;
    logId: number;
    source: string;
    time: string;
    weight: number;
  }>;
}

class FitbitService extends BaseIntegrationService {
  constructor() {
    super('fitbit', 'https://api.fitbit.com/1');
  }

  protected parsePaginatedResponse<T>(response: any): { items: T[]; nextCursor?: string } {
    // Fitbit responses vary by endpoint
    return {
      items: Array.isArray(response) ? response : [],
      nextCursor: undefined,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.getProfile(userId);
      return true;
    } catch {
      return false;
    }
  }

  // ============ User Profile ============

  async getProfile(userId: string): Promise<FitbitProfile> {
    return this.request(userId, '/user/-/profile.json');
  }

  async updateProfile(
    userId: string,
    data: {
      aboutMe?: string;
      birthday?: string;
      city?: string;
      country?: string;
      displayNameSetting?: string;
      firstName?: string;
      gender?: string;
      height?: number;
      lastName?: string;
      state?: string;
      strideLengthRunning?: number;
      strideLengthWalking?: number;
      weight?: number;
    }
  ): Promise<FitbitProfile> {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, value.toString());
    });

    return this.request(userId, `/user/-/profile.json?${params.toString()}`, {
      method: 'POST',
    });
  }

  // ============ Activities ============

  async getDailyActivitySummary(userId: string, date: string): Promise<FitbitActivitySummary> {
    return this.request(userId, `/user/-/activities/date/${date}.json`);
  }

  async getActivityLog(userId: string, logId: number): Promise<any> {
    return this.request(userId, `/user/-/activities/${logId}.json`);
  }

  async getRecentActivities(userId: string): Promise<any[]> {
    const response = await this.request<any>(userId, '/user/-/activities/recent.json');
    return response.activities || [];
  }

  async getFrequentActivities(userId: string): Promise<any[]> {
    const response = await this.request<any>(userId, '/user/-/activities/frequent.json');
    return response.activities || [];
  }

  async getFavoriteActivities(userId: string): Promise<any[]> {
    const response = await this.request<any>(userId, '/user/-/activities/favorite.json');
    return response.activities || [];
  }

  async logActivity(
    userId: string,
    activity: {
      activityId?: number;
      activityName?: string;
      date: string;
      startTime: string;
      durationMillis: number;
      distance?: number;
      distanceUnit?: string;
      manualCalories?: number;
    }
  ): Promise<FitbitActivity> {
    const params = new URLSearchParams();
    Object.entries(activity).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, value.toString());
    });

    return this.request(userId, `/user/-/activities.json?${params.toString()}`, {
      method: 'POST',
    });
  }

  async deleteActivityLog(userId: string, logId: number): Promise<void> {
    await this.request(userId, `/user/-/activities/${logId}.json`, {
      method: 'DELETE',
    });
  }

  async getActivityGoals(userId: string, period: 'daily' | 'weekly'): Promise<any> {
    return this.request(userId, `/user/-/activities/goals/${period}.json`);
  }

  async updateActivityGoals(
    userId: string,
    period: 'daily' | 'weekly',
    goals: {
      activeMinutes?: number;
      caloriesOut?: number;
      distance?: number;
      floors?: number;
      steps?: number;
    }
  ): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(goals).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, value.toString());
    });

    return this.request(userId, `/user/-/activities/goals/${period}.json?${params.toString()}`, {
      method: 'POST',
    });
  }

  async getActivityTimeSeries(
    userId: string,
    resourcePath: 'steps' | 'distance' | 'floors' | 'elevation' | 'calories' | 'activityCalories',
    dateRange: { startDate: string; endDate: string } | { date: string; period: '1d' | '7d' | '30d' | '1w' | '1m' | '3m' | '6m' | '1y' }
  ): Promise<any> {
    let path: string;
    if ('period' in dateRange) {
      path = `/user/-/activities/${resourcePath}/date/${dateRange.date}/${dateRange.period}.json`;
    } else {
      path = `/user/-/activities/${resourcePath}/date/${dateRange.startDate}/${dateRange.endDate}.json`;
    }
    return this.request(userId, path);
  }

  // ============ Sleep ============

  async getSleepLogs(userId: string, date: string): Promise<{ sleep: FitbitSleepLog[]; summary: any }> {
    return this.request(userId, `/user/-/sleep/date/${date}.json`);
  }

  async getSleepLogsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{ sleep: FitbitSleepLog[] }> {
    return this.request(userId, `/user/-/sleep/date/${startDate}/${endDate}.json`);
  }

  async getSleepLog(userId: string, logId: number): Promise<FitbitSleepLog> {
    return this.request(userId, `/user/-/sleep/${logId}.json`);
  }

  async logSleep(
    userId: string,
    sleep: {
      date: string;
      startTime: string;
      duration: number;
    }
  ): Promise<FitbitSleepLog> {
    const params = new URLSearchParams();
    params.set('date', sleep.date);
    params.set('startTime', sleep.startTime);
    params.set('duration', sleep.duration.toString());

    return this.request(userId, `/user/-/sleep.json?${params.toString()}`, {
      method: 'POST',
    });
  }

  async deleteSleepLog(userId: string, logId: number): Promise<void> {
    await this.request(userId, `/user/-/sleep/${logId}.json`, {
      method: 'DELETE',
    });
  }

  async getSleepGoal(userId: string): Promise<any> {
    return this.request(userId, '/user/-/sleep/goal.json');
  }

  async updateSleepGoal(userId: string, minDuration: number): Promise<any> {
    return this.request(userId, `/user/-/sleep/goal.json?minDuration=${minDuration}`, {
      method: 'POST',
    });
  }

  // ============ Heart Rate ============

  async getHeartRateByDate(userId: string, date: string): Promise<FitbitHeartRate> {
    return this.request(userId, `/user/-/activities/heart/date/${date}/1d.json`);
  }

  async getHeartRateByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<FitbitHeartRate> {
    return this.request(userId, `/user/-/activities/heart/date/${startDate}/${endDate}.json`);
  }

  async getHeartRateIntraday(
    userId: string,
    date: string,
    detailLevel: '1sec' | '1min' | '5min' | '15min' = '1min',
    startTime?: string,
    endTime?: string
  ): Promise<FitbitHeartRate> {
    let path = `/user/-/activities/heart/date/${date}/1d/${detailLevel}`;
    if (startTime && endTime) {
      path += `/time/${startTime}/${endTime}`;
    }
    return this.request(userId, `${path}.json`);
  }

  // ============ Body & Weight ============

  async getWeightLogs(userId: string, date: string): Promise<FitbitWeight> {
    return this.request(userId, `/user/-/body/log/weight/date/${date}.json`);
  }

  async getWeightLogsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<FitbitWeight> {
    return this.request(userId, `/user/-/body/log/weight/date/${startDate}/${endDate}.json`);
  }

  async logWeight(
    userId: string,
    weight: {
      weight: number;
      date: string;
      time?: string;
      fat?: number;
    }
  ): Promise<any> {
    const params = new URLSearchParams();
    params.set('weight', weight.weight.toString());
    params.set('date', weight.date);
    if (weight.time) params.set('time', weight.time);
    if (weight.fat) params.set('fat', weight.fat.toString());

    return this.request(userId, `/user/-/body/log/weight.json?${params.toString()}`, {
      method: 'POST',
    });
  }

  async deleteWeightLog(userId: string, logId: number): Promise<void> {
    await this.request(userId, `/user/-/body/log/weight/${logId}.json`, {
      method: 'DELETE',
    });
  }

  async getBodyGoals(userId: string, goalType: 'weight' | 'fat'): Promise<any> {
    return this.request(userId, `/user/-/body/log/${goalType}/goal.json`);
  }

  async getBodyFatLogs(userId: string, date: string): Promise<any> {
    return this.request(userId, `/user/-/body/log/fat/date/${date}.json`);
  }

  async logBodyFat(userId: string, fat: number, date: string, time?: string): Promise<any> {
    const params = new URLSearchParams();
    params.set('fat', fat.toString());
    params.set('date', date);
    if (time) params.set('time', time);

    return this.request(userId, `/user/-/body/log/fat.json?${params.toString()}`, {
      method: 'POST',
    });
  }

  // ============ Food & Nutrition ============

  async getFoodLogs(userId: string, date: string): Promise<FitbitFood> {
    return this.request(userId, `/user/-/foods/log/date/${date}.json`);
  }

  async logFood(
    userId: string,
    food: {
      foodId?: number;
      foodName?: string;
      mealTypeId: number;
      unitId: number;
      amount: number;
      date: string;
      favorite?: boolean;
      brandName?: string;
      calories?: number;
    }
  ): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(food).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, value.toString());
    });

    return this.request(userId, `/user/-/foods/log.json?${params.toString()}`, {
      method: 'POST',
    });
  }

  async deleteFoodLog(userId: string, logId: number): Promise<void> {
    await this.request(userId, `/user/-/foods/log/${logId}.json`, {
      method: 'DELETE',
    });
  }

  async getWaterLogs(userId: string, date: string): Promise<any> {
    return this.request(userId, `/user/-/foods/log/water/date/${date}.json`);
  }

  async logWater(userId: string, amount: number, date: string, unit?: string): Promise<any> {
    const params = new URLSearchParams();
    params.set('amount', amount.toString());
    params.set('date', date);
    if (unit) params.set('unit', unit);

    return this.request(userId, `/user/-/foods/log/water.json?${params.toString()}`, {
      method: 'POST',
    });
  }

  async deleteWaterLog(userId: string, logId: number): Promise<void> {
    await this.request(userId, `/user/-/foods/log/water/${logId}.json`, {
      method: 'DELETE',
    });
  }

  async getFoodGoals(userId: string): Promise<any> {
    return this.request(userId, '/user/-/foods/log/goal.json');
  }

  // ============ Devices ============

  async getDevices(userId: string): Promise<any[]> {
    return this.request(userId, '/user/-/devices.json');
  }

  async getAlarms(userId: string, trackerId: string): Promise<any[]> {
    return this.request(userId, `/user/-/devices/tracker/${trackerId}/alarms.json`);
  }

  // ============ Friends & Leaderboard ============

  async getFriends(userId: string): Promise<any[]> {
    const response = await this.request<any>(userId, '/user/-/friends.json');
    return response.friends || [];
  }

  async getFriendsLeaderboard(userId: string): Promise<any[]> {
    const response = await this.request<any>(userId, '/user/-/leaderboard/friends.json');
    return response.leaderboard || [];
  }
}

// ============================================================================
// GARMIN SERVICE
// ============================================================================

export interface GarminProfile {
  userId: string;
  displayName: string;
  fullName: string;
  profileImageUrl: string;
  location: string;
  timeZone: string;
}

export interface GarminActivity {
  activityId: number;
  activityName: string;
  description: string;
  startTimeLocal: string;
  startTimeGMT: string;
  activityType: {
    typeId: number;
    typeKey: string;
  };
  eventType: {
    typeId: number;
    typeKey: string;
  };
  distance: number;
  duration: number;
  elapsedDuration: number;
  movingDuration: number;
  elevationGain: number;
  elevationLoss: number;
  averageSpeed: number;
  maxSpeed: number;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  calories: number;
  averageHR: number;
  maxHR: number;
  averageRunningCadence: number;
  maxRunningCadence: number;
  steps: number;
  userProfileId: number;
  deviceId: number;
}

export interface GarminDailySummary {
  userProfilePK: number;
  calendarDate: string;
  totalKilocalories: number;
  activeKilocalories: number;
  bmrKilocalories: number;
  wellnessKilocalories: number;
  totalSteps: number;
  totalDistanceMeters: number;
  wellnessDistanceMeters: number;
  wellnessActiveKilocalories: number;
  minHeartRate: number;
  maxHeartRate: number;
  restingHeartRate: number;
  averageStressLevel: number;
  maxStressLevel: number;
  stressDuration: number;
  restStressDuration: number;
  activityStressDuration: number;
  lowStressDuration: number;
  mediumStressDuration: number;
  highStressDuration: number;
  floorsAscendedInMeters: number;
  floorsDescendedInMeters: number;
  floorsAscended: number;
  floorsDescended: number;
  intensityMinutesGoal: number;
  userIntensityMinutesGoal: number;
  moderateIntensityMinutes: number;
  vigorousIntensityMinutes: number;
  totalPushDistance: number;
  totalPushDuration: number;
}

export interface GarminSleep {
  dailySleepDTO: {
    id: number;
    userProfilePK: number;
    calendarDate: string;
    sleepTimeSeconds: number;
    napTimeSeconds: number;
    sleepWindowConfirmed: boolean;
    sleepWindowConfirmationType: string;
    sleepStartTimestampGMT: number;
    sleepEndTimestampGMT: number;
    sleepStartTimestampLocal: number;
    sleepEndTimestampLocal: number;
    autoSleepStartTimestampGMT: number;
    autoSleepEndTimestampGMT: number;
    sleepQualityTypePK: number;
    sleepResultTypePK: number;
    unmeasurableSleepSeconds: number;
    deepSleepSeconds: number;
    lightSleepSeconds: number;
    remSleepSeconds: number;
    awakeSleepSeconds: number;
    averageSpO2Value: number;
    lowestSpO2Value: number;
    highestSpO2Value: number;
    averageSpO2HRSleep: number;
    averageRespirationValue: number;
    lowestRespirationValue: number;
    highestRespirationValue: number;
    awakeCount: number;
    avgSleepStress: number;
    ageGroup: string;
    sleepScoreFeedback: string;
    sleepScoreInsight: string;
  };
  sleepMovement: Array<{
    startGMT: number;
    endGMT: number;
    activityLevel: number;
  }>;
  remSleepData: boolean;
  sleepLevels: Array<{
    startGMT: number;
    endGMT: number;
    activityLevel: number;
  }>;
  restingHeartRate: number;
}

export interface GarminBodyComposition {
  totalAverage: {
    samplePK: number;
    calendarDate: string;
    measurementTimestamp: number;
    weight: number;
    bmi: number;
    bodyFat: number;
    bodyWater: number;
    boneMass: number;
    muscleMass: number;
    physiqueRating: number;
    visceralFat: number;
    metabolicAge: number;
  };
  dateWeightList: Array<{
    samplePK: number;
    calendarDate: string;
    measurementTimestamp: number;
    weight: number;
    sourceType: string;
  }>;
}

class GarminService extends BaseIntegrationService {
  constructor() {
    // Garmin uses OAuth 1.0a with their Connect API
    // The API endpoint base URL
    super('garmin', 'https://apis.garmin.com/wellness-api/rest');
  }

  protected parsePaginatedResponse<T>(response: any): { items: T[]; nextCursor?: string } {
    return {
      items: Array.isArray(response) ? response : [],
      nextCursor: undefined,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.getUserProfile(userId);
      return true;
    } catch {
      return false;
    }
  }

  // ============ User Profile ============

  async getUserProfile(userId: string): Promise<GarminProfile> {
    return this.request(userId, '/user/id');
  }

  // ============ Activities ============

  async getDailyActivities(
    userId: string,
    date: string
  ): Promise<GarminActivity[]> {
    return this.request(userId, `/activities?date=${date}`);
  }

  async getActivityDetails(userId: string, activityId: number): Promise<GarminActivity> {
    return this.request(userId, `/activities/${activityId}`);
  }

  async getActivityTypes(userId: string): Promise<any[]> {
    return this.request(userId, '/activity-types');
  }

  // ============ Daily Summary ============

  async getDailySummary(userId: string, date: string): Promise<GarminDailySummary> {
    return this.request(userId, `/dailies?date=${date}`);
  }

  async getDailySummaries(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<GarminDailySummary[]> {
    return this.request(userId, `/dailies?startDate=${startDate}&endDate=${endDate}`);
  }

  // ============ Steps ============

  async getSteps(userId: string, date: string): Promise<any> {
    return this.request(userId, `/steps?date=${date}`);
  }

  async getStepsRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    return this.request(userId, `/steps?startDate=${startDate}&endDate=${endDate}`);
  }

  // ============ Heart Rate ============

  async getHeartRate(userId: string, date: string): Promise<any> {
    return this.request(userId, `/heartrates?date=${date}`);
  }

  async getHeartRateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    return this.request(userId, `/heartrates?startDate=${startDate}&endDate=${endDate}`);
  }

  // ============ Sleep ============

  async getSleepData(userId: string, date: string): Promise<GarminSleep> {
    return this.request(userId, `/sleeps?date=${date}`);
  }

  async getSleepDataRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<GarminSleep[]> {
    return this.request(userId, `/sleeps?startDate=${startDate}&endDate=${endDate}`);
  }

  // ============ Body Composition ============

  async getBodyComposition(userId: string, date: string): Promise<GarminBodyComposition> {
    return this.request(userId, `/bodyComps?date=${date}`);
  }

  async getBodyCompositionRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<GarminBodyComposition[]> {
    return this.request(userId, `/bodyComps?startDate=${startDate}&endDate=${endDate}`);
  }

  // ============ Stress ============

  async getStressData(userId: string, date: string): Promise<any> {
    return this.request(userId, `/stressDetails?date=${date}`);
  }

  async getStressDataRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    return this.request(userId, `/stressDetails?startDate=${startDate}&endDate=${endDate}`);
  }

  // ============ Respiration ============

  async getRespirationData(userId: string, date: string): Promise<any> {
    return this.request(userId, `/respirationData?date=${date}`);
  }

  async getRespirationDataRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    return this.request(userId, `/respirationData?startDate=${startDate}&endDate=${endDate}`);
  }

  // ============ Pulse Ox (SpO2) ============

  async getPulseOxData(userId: string, date: string): Promise<any> {
    return this.request(userId, `/pulseOx?date=${date}`);
  }

  async getPulseOxDataRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    return this.request(userId, `/pulseOx?startDate=${startDate}&endDate=${endDate}`);
  }

  // ============ Floors ============

  async getFloorsData(userId: string, date: string): Promise<any> {
    return this.request(userId, `/floors?date=${date}`);
  }

  async getFloorsDataRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    return this.request(userId, `/floors?startDate=${startDate}&endDate=${endDate}`);
  }

  // ============ Move IQ ============

  async getMoveIQActivities(userId: string, date: string): Promise<any[]> {
    return this.request(userId, `/moveiq?date=${date}`);
  }

  async getMoveIQActivitiesRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    return this.request(userId, `/moveiq?startDate=${startDate}&endDate=${endDate}`);
  }

  // ============ User Metrics ============

  async getUserMetrics(userId: string): Promise<any> {
    return this.request(userId, '/userMetrics');
  }

  // ============ Training Status ============

  async getTrainingStatus(userId: string): Promise<any> {
    return this.request(userId, '/trainingStatus');
  }

  async getVO2Max(userId: string): Promise<any> {
    return this.request(userId, '/vo2max');
  }

  async getTrainingEffect(userId: string, date: string): Promise<any> {
    return this.request(userId, `/trainingEffect?date=${date}`);
  }

  // ============ Intensity Minutes ============

  async getIntensityMinutes(userId: string, date: string): Promise<any> {
    return this.request(userId, `/intensityMinutes?date=${date}`);
  }

  async getIntensityMinutesRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    return this.request(userId, `/intensityMinutes?startDate=${startDate}&endDate=${endDate}`);
  }

  // ============ Hydration ============

  async getHydrationData(userId: string, date: string): Promise<any> {
    return this.request(userId, `/hydration?date=${date}`);
  }

  async getHydrationDataRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    return this.request(userId, `/hydration?startDate=${startDate}&endDate=${endDate}`);
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCES
// ============================================================================

export const stravaService = new StravaService();
export const fitbitService = new FitbitService();
export const garminService = new GarminService();

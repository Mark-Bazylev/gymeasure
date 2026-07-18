# Gymeasure

Private-circle gym tracking for a lifter and their Gym Buddies: build Training Days, log Sessions, track Volume, and Compare progress on the same Exercise.

## Language

**Training Day**:
A personal reusable template of Exercises and Planned Sets for a workout.
_Avoid_: Workout plan, program day, routine (when meaning the template)

**Planned Set**:
One prescribed attempt of an Exercise inside a Training Day, recorded as target weight (kg) and reps.
_Avoid_: Target scheme, prescription row (as the entity name)

**Session**:
A dated record of what was actually performed in the gym, snapshotted from a Training Day when started.
_Avoid_: Workout log, training day (when meaning the performed workout)

**Active Session**:
A Session that is still in progress and can be resumed; at most one Active Session exists per User.
_Avoid_: Draft workout, unfinished log

**Set**:
One performed attempt of an Exercise within a Session. A Set may be pending, completed, or skipped; Volume counts completed Sets only.
_Avoid_: Rep scheme, working set (unless distinguishing warm-ups later)

**Volume**:
The sum of (effective weight × reps) across completed Sets for an Exercise within a Session; progress graphs derive Volume over time.
_Avoid_: Tonnage (as a separate concept), workload

**Exercise**:
A movement from Gymeasure’s owned catalog (imported from redistributable open sources with attribution). Catalog Exercises are required so Gym Buddies Compare on the same identity.
_Avoid_: Custom exercise, movement, lift (as the entity name)

**Loading Type**:
How resistance is interpreted for an Exercise: external weight, bodyweight plus optional added load, or bodyweight minus assistance.
_Avoid_: Weight mode, resistance kind

**Gym Buddy**:
Another User linked via invite code who can see full Session history for comparison.
_Avoid_: Friend, follower, connection

**Compare**:
Side-by-side Volume over time for the same Exercise between the User and a Gym Buddy.
_Avoid_: Leaderboard, duel, rivalry

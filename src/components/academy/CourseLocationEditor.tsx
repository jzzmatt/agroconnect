"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CourseConfirmDialog } from "@/components/academy/CourseConfirmDialog";
import { LocationMap, LocationSearch, type MapMarkerItem } from "@/components/location";
import { getDefaultLocationProvider } from "@/lib/location";
import { DEFAULT_ANGOLA_CENTER } from "@/lib/location/map-lifecycle";
import { courseHasMapLocation, validateCourseCoordinates } from "@/lib/academy/course-location";
import { updateCourseLocationAction } from "@/lib/services/course-actions";
import { useI18n } from "@/i18n/provider";
import type { CourseRecord } from "@/types/agriacademy";
import type { GeoCoordinate } from "@/types/domain";

type DraftLocation = {
  locationName: string;
  locationAddress: string;
  latitude: number;
  longitude: number;
};

export function CourseLocationEditor({
  course,
  disabled,
  onCourseUpdated,
}: {
  course: Pick<
    CourseRecord,
    "id" | "location_name" | "location_address" | "latitude" | "longitude"
  >;
  disabled?: boolean;
  onCourseUpdated: (course: CourseRecord) => void;
}) {
  const { dict } = useI18n();
  const [draft, setDraft] = useState<DraftLocation | null>(() => {
    if (!courseHasMapLocation(course)) return null;
    return {
      locationName: course.location_name || "",
      locationAddress: course.location_address || "",
      latitude: course.latitude as number,
      longitude: course.longitude as number,
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  const center = useMemo<GeoCoordinate>(() => {
    if (draft) return { latitude: draft.latitude, longitude: draft.longitude };
    if (courseHasMapLocation(course)) {
      return { latitude: course.latitude as number, longitude: course.longitude as number };
    }
    return DEFAULT_ANGOLA_CENTER;
  }, [course, draft]);

  const pickerMarker: MapMarkerItem[] = useMemo(() => {
    if (!draft) return [];
    return [
      {
        id: "course-location-draft",
        title: draft.locationName || dict.agriacademy.courseEditorLocationSelected,
        category: "academy",
        latitude: draft.latitude,
        longitude: draft.longitude,
        provinceName: draft.locationName || "Angola",
      },
    ];
  }, [draft, dict.agriacademy.courseEditorLocationSelected]);

  const applyCoordinates = useCallback(
    async (coordinates: GeoCoordinate, labelHint?: string) => {
      const validation = validateCourseCoordinates(coordinates.latitude, coordinates.longitude);
      if (!validation.ok) {
        setError(dict.agriacademy.courseEditorLocationInvalidCoordinates);
        return;
      }

      let locationName = labelHint || "";
      let locationAddress = labelHint || "";
      try {
        const provider = getDefaultLocationProvider().geocodingProvider;
        const reversed = await provider.reverse(coordinates);
        if (reversed) {
          locationName = reversed.name;
          locationAddress = reversed.formattedAddress;
        }
      } catch {
        if (!locationName) {
          locationName = `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`;
          locationAddress = locationName;
        }
      }

      setDraft({
        locationName,
        locationAddress,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
      setError(null);
    },
    [dict.agriacademy.courseEditorLocationInvalidCoordinates]
  );

  const saveLocation = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    const result = await updateCourseLocationAction({
      courseId: course.id,
      locationName: draft.locationName,
      locationAddress: draft.locationAddress,
      latitude: draft.latitude,
      longitude: draft.longitude,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || dict.agriacademy.courseEditorLocationSaveFailed);
      return;
    }
    onCourseUpdated(result.data);
  };

  const removeLocation = async () => {
    setSaving(true);
    setError(null);
    const result = await updateCourseLocationAction({ courseId: course.id, clearLocation: true });
    setSaving(false);
    if (!result.success) {
      setError(result.error || dict.agriacademy.courseEditorLocationSaveFailed);
      return;
    }
    setDraft(null);
    setRemoveOpen(false);
    onCourseUpdated(result.data);
  };

  const hasSavedLocation = courseHasMapLocation(course);
  const dirty =
    draft &&
    (draft.latitude !== course.latitude ||
      draft.longitude !== course.longitude ||
      draft.locationName !== (course.location_name || ""));

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface/40 p-4">
      <div>
        <h3 className="text-sm font-black">{dict.agriacademy.courseEditorLocationTitle}</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          {dict.agriacademy.courseEditorLocationHint}
        </p>
      </div>

      <LocationSearch
        placeholder={dict.agriacademy.courseEditorLocationSearchPlaceholder}
        onSelectLocation={(result) => {
          void applyCoordinates(result.coordinates, result.formattedAddress);
        }}
      />

      <LocationMap
        markers={pickerMarker}
        center={center}
        zoom={draft || hasSavedLocation ? 11 : 6}
        height="h-[280px]"
        showControls
        onMapClick={(coordinates) => {
          void applyCoordinates(coordinates);
        }}
      />

      {draft ? (
        <div className="space-y-1 text-xs">
          <p className="font-semibold">{dict.agriacademy.courseEditorLocationSelected}</p>
          <p>{draft.locationName}</p>
          {draft.locationAddress && draft.locationAddress !== draft.locationName ? (
            <p className="text-muted-foreground">{draft.locationAddress}</p>
          ) : null}
          <p className="text-[11px] text-muted-foreground font-mono">
            {dict.agriacademy.courseEditorLocationLatitude}: {draft.latitude.toFixed(5)}
            {" · "}
            {dict.agriacademy.courseEditorLocationLongitude}: {draft.longitude.toFixed(5)}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{dict.agriacademy.courseEditorLocationEmpty}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {dirty ? (
          <Button type="button" size="sm" disabled={disabled || saving} onClick={() => void saveLocation()}>
            {saving ? dict.agriacademy.courseEditorLocationSaving : dict.agriacademy.courseEditorLocationSave}
          </Button>
        ) : null}
        {hasSavedLocation ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || saving}
            onClick={() => setRemoveOpen(true)}
          >
            {dict.agriacademy.courseEditorLocationRemove}
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}

      <CourseConfirmDialog
        open={removeOpen}
        title={dict.agriacademy.courseEditorLocationRemoveTitle}
        message={dict.agriacademy.courseEditorLocationRemoveMessage}
        confirmLabel={dict.agriacademy.courseEditorLocationRemove}
        cancelLabel={dict.common.cancel}
        confirmVariant="destructive"
        loading={saving}
        onCancel={() => setRemoveOpen(false)}
        onConfirm={() => void removeLocation()}
      />
    </section>
  );
}

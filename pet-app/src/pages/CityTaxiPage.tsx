import { useCallback, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Form,
    Input,
    InputNumber,
    Radio,
    Select,
    Space,
    Typography,
} from 'antd';
import { Autocomplete, DirectionsRenderer, GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { toast } from '../petToast';
import { COUNTRY_ISO, findCityById, type MajorCityDef, MAJOR_CITIES_FR_DE_GB } from '../data/cityTaxiCities';
import { DOG_WITHERS_HEIGHT_CM_OPTIONS } from '../data/dogWithersHeightsCm';
import { petMoverSelectOptions, usePetMovers } from '../petMoversStorage';
import { petTheme } from '../theme/palette';
import type { CityTaxiClass, CityTaxiSpecies } from '../utils/cityTaxiPricing';
import { cityTaxiTripPriceEur, dogWithersHeightSurchargeMultiplier } from '../utils/cityTaxiPricing';

const MAP_CONTAINER_STYLE = { width: '100%', height: 420 };

type LatLng = { lat: number; lng: number };

function mapsPointInCity (lat: number, lng: number, city: MajorCityDef): boolean {
    if (typeof google === 'undefined' || !google.maps?.geometry?.spherical) {
        return true;
    }
    const centre = new google.maps.LatLng(city.center.lat, city.center.lng);
    const pt = new google.maps.LatLng(lat, lng);
    const metres = google.maps.geometry.spherical.computeDistanceBetween(centre, pt);

    return metres <= city.radiusKm * 1000;
}

function CityTaxiMapSection ({
    apiKey,
}: {
    apiKey: string;
}): JSX.Element {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'city-taxi-google-maps',
        googleMapsApiKey: apiKey,
        libraries: ['places', 'geometry'],
    });

    const [petMovers] = usePetMovers();
    const [form] = Form.useForm<{
        cityId: string;
        species: CityTaxiSpecies;
        taxiClass: CityTaxiClass;
        weightKg: number;
        dogHeightCm?: number;
        cage?: boolean;
        petMoverId: string;
    }>();

    const taxiMoverOptions = useMemo(
        () => petMoverSelectOptions(petMovers, 'id', (m) => m.movementType === 'taxi'),
        [petMovers]
    );

    const cityId = Form.useWatch('cityId', form);
    const species = Form.useWatch('species', form) as CityTaxiSpecies | undefined;
    const taxiClass = Form.useWatch('taxiClass', form) as CityTaxiClass | undefined;
    const cageVal = Form.useWatch('cage', form);
    const dogHeightCm = Form.useWatch('dogHeightCm', form) as number | undefined;

    const city = useMemo(() => (cityId ? findCityById(cityId) : undefined), [cityId]);

    const pickupAcRef = useRef<google.maps.places.Autocomplete | null>(null);
    const dropAcRef = useRef<google.maps.places.Autocomplete | null>(null);
    const pickupInputRef = useRef<HTMLInputElement | null>(null);
    const dropoffInputRef = useRef<HTMLInputElement | null>(null);

    /** Next click on the map sets pickup or drop-off (reverse-geocoded). */
    const [mapSetMode, setMapSetMode] = useState<'pickup' | 'dropoff'>('pickup');

    const [pickup, setPickup] = useState<{ latLng: LatLng; address: string } | null>(null);
    const [dropoff, setDropoff] = useState<{ latLng: LatLng; address: string } | null>(null);
    const pickupRouteRef = useRef(pickup);
    const dropoffRouteRef = useRef(dropoff);
    pickupRouteRef.current = pickup;
    dropoffRouteRef.current = dropoff;

    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [distanceKm, setDistanceKm] = useState<number | null>(null);

    const resetRoute = useCallback(() => {
        setDirections(null);
        setDistanceKm(null);
    }, []);

    const runDirections = useCallback(
        (origin: LatLng, destination: LatLng) => {
            if (typeof google === 'undefined') {
                return;
            }
            const svc = new google.maps.DirectionsService();
            svc.route(
                {
                    origin,
                    destination,
                    travelMode: google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status !== google.maps.DirectionsStatus.OK || !result?.routes[0]?.legs[0]) {
                        toast.error('Could not compute driving route');
                        resetRoute();

                        return;
                    }
                    setDirections(result);
                    const metres = result.routes[0].legs[0].distance?.value ?? 0;
                    setDistanceKm(metres / 1000);
                }
            );
        },
        [resetRoute]
    );

    const onPickupPlace = useCallback(() => {
        const ac = pickupAcRef.current;
        const c = city;
        if (!ac || !c) {
            return;
        }
        const place = ac.getPlace();
        const loc = place.geometry?.location;
        if (!loc) {
            return;
        }
        const lat = loc.lat();
        const lng = loc.lng();
        if (!mapsPointInCity(lat, lng, c)) {
            toast.error('Pickup address must be within the selected city service area');
            setPickup(null);
            resetRoute();

            return;
        }
        const address = place.formatted_address ?? place.name ?? '';
        const latLng = { lat, lng };
        setPickup({ latLng, address });
        if (pickupInputRef.current) {
            pickupInputRef.current.value = address;
        }
        if (dropoff) {
            runDirections(latLng, dropoff.latLng);
        } else {
            resetRoute();
        }
    }, [city, dropoff, resetRoute, runDirections]);

    const onDropPlace = useCallback(() => {
        const ac = dropAcRef.current;
        const c = city;
        if (!ac || !c) {
            return;
        }
        const place = ac.getPlace();
        const loc = place.geometry?.location;
        if (!loc) {
            return;
        }
        const lat = loc.lat();
        const lng = loc.lng();
        if (!mapsPointInCity(lat, lng, c)) {
            toast.error('Drop-off address must be within the selected city service area');
            setDropoff(null);
            resetRoute();

            return;
        }
        const address = place.formatted_address ?? place.name ?? '';
        const latLng = { lat, lng };
        setDropoff({ latLng, address });
        if (dropoffInputRef.current) {
            dropoffInputRef.current.value = address;
        }
        if (pickup) {
            runDirections(pickup.latLng, latLng);
        } else {
            resetRoute();
        }
    }, [city, pickup, resetRoute, runDirections]);

    const onMapClick = useCallback(
        (e: google.maps.MapMouseEvent) => {
            const c = city;
            const latLng = e.latLng;
            if (!c || !latLng) {
                return;
            }
            const lat = latLng.lat();
            const lng = latLng.lng();
            if (!mapsPointInCity(lat, lng, c)) {
                toast.error('Choose a point inside the selected city service area');

                return;
            }
            const point = { lat, lng };
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: point }, (results, status) => {
                if (status !== 'OK' || !results?.[0]) {
                    toast.error('Could not resolve address for this map point');

                    return;
                }
                const address = results[0].formatted_address ?? '';
                if (mapSetMode === 'pickup') {
                    const next = { latLng: point, address };
                    setPickup(next);
                    pickupRouteRef.current = next;
                    if (pickupInputRef.current) {
                        pickupInputRef.current.value = address;
                    }
                    const drop = dropoffRouteRef.current;
                    if (drop) {
                        runDirections(point, drop.latLng);
                    } else {
                        resetRoute();
                    }
                } else {
                    const next = { latLng: point, address };
                    setDropoff(next);
                    dropoffRouteRef.current = next;
                    if (dropoffInputRef.current) {
                        dropoffInputRef.current.value = address;
                    }
                    const pu = pickupRouteRef.current;
                    if (pu) {
                        runDirections(pu.latLng, point);
                    } else {
                        resetRoute();
                    }
                }
            });
        },
        [city, mapSetMode, resetRoute, runDirections]
    );

    const mapCenter = city?.center ?? { lat: 48.8566, lng: 2.3522 };

    const dogWithCage = species === 'dog' && cageVal === true;
    const canEstimatePrice =
        distanceKm !== null
        && species
        && taxiClass
        && (species !== 'dog' || (dogHeightCm !== undefined && dogHeightCm !== null));

    const pricePreview = canEstimatePrice
        ? cityTaxiTripPriceEur(
            distanceKm as number,
            species,
            dogWithCage,
            taxiClass,
            species === 'dog' ? dogHeightCm : undefined
        )
        : null;

    const dogHeightExtraPercent =
        species === 'dog' && dogHeightCm !== undefined && dogHeightCm !== null
            ? Math.round((dogWithersHeightSurchargeMultiplier(dogHeightCm) - 1) * 100)
            : 0;

    const autocompleteOpts = useMemo(() => {
        if (!city) {
            return undefined;
        }

        return {
            componentRestrictions: { country: COUNTRY_ISO[city.country] },
            fields: ['formatted_address', 'geometry', 'name'] as const,
        };
    }, [city]);

    const openGoogleMapsExternal = useCallback(() => {
        if (!pickup?.address || !dropoff?.address) {
            return;
        }
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dropoff.address)}&origin=${encodeURIComponent(pickup.address)}`, '_blank');
    }, [pickup, dropoff]);

    const submit = useCallback(async () => {
        const v = await form.validateFields();
        if (!pickup || !dropoff || distanceKm === null) {
            toast.error('Set departure and arrival addresses (search or map) and wait for route distance');

            return;
        }
        if (!city) {
            return;
        }
        if (species === 'dog') {
            if (v.dogHeightCm === undefined || v.dogHeightCm === null) {
                toast.error('Height at withers is required for dogs');

                return;
            }
            if (v.cage === undefined || v.cage === null) {
                toast.error('Select cage option for dogs');

                return;
            }
        }
        const mover = petMovers.find((m) => m.id === v.petMoverId);
        toast.success(
            `City taxi request saved (${mover?.name ?? 'mover'}): ~${pricePreview?.toFixed(2)} EUR — ${distanceKm.toFixed(2)} km`
        );
    }, [city, distanceKm, form, petMovers, pickup, dropoff, species, pricePreview]);

    if (loadError) {
        return (
            <Alert
                type="error"
                showIcon
                message="Google Maps failed to load"
                description={String(loadError)}
            />
        );
    }

    if (!isLoaded) {
        return <Typography.Text type="secondary">Loading map…</Typography.Text>;
    }

    return (
        <div data-testid="city-taxi-page">
            <Space direction="vertical" size={12} style={{ width: '100%', marginBottom: 16 }}>
                <h2 style={{ margin: 0, color: petTheme.text }}>City Pet Taxi</h2>
                <Typography.Paragraph style={{ margin: 0, color: petTheme.textMuted }}>
                    Address-to-address pet transport within major cities in France, Germany, and the United Kingdom.
                    Cats and dogs only. Currency is EUR. Not linked to PetShipping.
                </Typography.Paragraph>
            </Space>

            {taxiMoverOptions.length === 0 ? (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="No taxi PetMover"
                    description='Add an active PetMover with movement type "Taxi (city delivery)" under PetMovers.'
                />
            ) : null}

            <Form
                form={form}
                layout="vertical"
                className="ant-form"
                initialValues={{
                    species: 'dog' as CityTaxiSpecies,
                    taxiClass: 'economy' as CityTaxiClass,
                    cage: false,
                }}
                data-testid="city-taxi-form"
            >
                <Form.Item name="cityId" label="City" rules={[{ required: true, message: 'Required' }]}>
                    <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Select city"
                        options={MAJOR_CITIES_FR_DE_GB.map((c) => ({ value: c.id, label: `${c.label} (${c.country})` }))}
                        data-testid="city-taxi-field-city"
                        onChange={() => {
                            setPickup(null);
                            setDropoff(null);
                            resetRoute();
                            if (pickupInputRef.current) {
                                pickupInputRef.current.value = '';
                            }
                            if (dropoffInputRef.current) {
                                dropoffInputRef.current.value = '';
                            }
                        }}
                    />
                </Form.Item>

                <Form.Item name="species" label="Pet" rules={[{ required: true }]}>
                    <Radio.Group data-testid="city-taxi-field-species">
                        <Radio.Button value="dog">Dog</Radio.Button>
                        <Radio.Button value="cat">Cat</Radio.Button>
                    </Radio.Group>
                </Form.Item>

                <Form.Item name="taxiClass" label="Taxi class" rules={[{ required: true }]}>
                    <Radio.Group data-testid="city-taxi-field-class">
                        <Radio.Button value="economy">Economy</Radio.Button>
                        <Radio.Button value="business">Business (+25%)</Radio.Button>
                    </Radio.Group>
                </Form.Item>

                <Form.Item name="weightKg" label="Pet weight (kg)" rules={[{ required: true, message: 'Required' }]}>
                    <InputNumber min={0.5} max={120} step={0.1} style={{ width: '100%' }} data-testid="city-taxi-field-weight" />
                </Form.Item>

                {species === 'dog' ? (
                    <>
                        <Form.Item
                            name="dogHeightCm"
                            label="Height at withers (cm)"
                            rules={[{ required: true, message: 'Required' }]}
                            tooltip="Shoulder height — range covers typical FCI breed extremes (toy through giant)."
                        >
                            <Select
                                showSearch
                                optionFilterProp="label"
                                options={DOG_WITHERS_HEIGHT_CM_OPTIONS}
                                placeholder="Select cm"
                                data-testid="city-taxi-field-dog-height"
                            />
                        </Form.Item>
                        <Form.Item name="cage" label="Crate / cage" rules={[{ required: true, message: 'Required' }]}>
                            <Radio.Group data-testid="city-taxi-field-cage">
                                <Radio value={false}>No (base 3 EUR/km)</Radio>
                                <Radio value={true}>Yes (base 3.5 EUR/km)</Radio>
                            </Radio.Group>
                        </Form.Item>
                    </>
                ) : null}

                <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Departure and arrival
                </Typography.Text>
                {!city ? (
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                        Choose a city to search addresses and use the map.
                    </Typography.Paragraph>
                ) : (
                    <Space direction="vertical" size={12} style={{ width: '100%', marginBottom: 16 }}>
                        <Form.Item
                            label="Departure address (pickup)"
                            required
                            tooltip="Search with Google Places or click the map below to set pickup."
                        >
                            <Autocomplete
                                onLoad={(ac) => {
                                    pickupAcRef.current = ac;
                                }}
                                onPlaceChanged={onPickupPlace}
                                options={autocompleteOpts}
                            >
                                <input
                                    ref={pickupInputRef}
                                    type="text"
                                    placeholder="Search departure address"
                                    style={{ width: '100%', padding: '8px 10px' }}
                                    data-testid="city-taxi-pickup-input"
                                />
                            </Autocomplete>
                            {pickup?.address ? (
                                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                                    Selected: {pickup.address}
                                </Typography.Text>
                            ) : null}
                        </Form.Item>
                        <Form.Item
                            label="Arrival address (drop-off)"
                            required
                            tooltip="Search with Google Places or click the map below to set drop-off."
                        >
                            <Autocomplete
                                onLoad={(ac) => {
                                    dropAcRef.current = ac;
                                }}
                                onPlaceChanged={onDropPlace}
                                options={autocompleteOpts}
                            >
                                <input
                                    ref={dropoffInputRef}
                                    type="text"
                                    placeholder="Search arrival address"
                                    style={{ width: '100%', padding: '8px 10px' }}
                                    data-testid="city-taxi-dropoff-input"
                                />
                            </Autocomplete>
                            {dropoff?.address ? (
                                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                                    Selected: {dropoff.address}
                                </Typography.Text>
                            ) : null}
                        </Form.Item>
                    </Space>
                )}

                <Card size="small" title="Route preview" style={{ marginBottom: 16 }}>
                    {city ? (
                        <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 12 }}>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                Map click sets the stop chosen below (reverse geocoded). Click must be inside the city
                                area.
                            </Typography.Text>
                            <Radio.Group
                                value={mapSetMode}
                                onChange={(e) => {
                                    setMapSetMode(e.target.value as 'pickup' | 'dropoff');
                                }}
                                optionType="button"
                                buttonStyle="solid"
                            >
                                <Radio.Button value="pickup">Next click: departure</Radio.Button>
                                <Radio.Button value="dropoff">Next click: arrival</Radio.Button>
                            </Radio.Group>
                        </Space>
                    ) : null}
                    <GoogleMap
                        mapContainerStyle={MAP_CONTAINER_STYLE}
                        center={mapCenter}
                        zoom={city ? 12 : 6}
                        onClick={onMapClick}
                    >
                        {directions ? <DirectionsRenderer directions={directions} /> : null}
                    </GoogleMap>
                    <Form.Item
                        label="Route distance (km)"
                        style={{ marginTop: 16, marginBottom: 0 }}
                        tooltip="Driving distance from Google Directions — filled automatically when both stops are set."
                    >
                        <Input
                            readOnly
                            value={distanceKm !== null ? distanceKm.toFixed(2) : ''}
                            placeholder="Calculated automatically"
                            data-testid="city-taxi-route-distance-km"
                        />
                    </Form.Item>
                    {distanceKm === null ? (
                        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                            Set both departure and arrival (search or map) to compute distance and draw the route.
                        </Typography.Paragraph>
                    ) : null}
                </Card>

                <Form.Item
                    name="petMoverId"
                    label="Pet mover (taxi)"
                    rules={[{ required: true, message: 'Required' }]}
                >
                    <Select
                        showSearch
                        optionFilterProp="label"
                        options={taxiMoverOptions}
                        placeholder="Select taxi operator"
                        data-testid="city-taxi-field-pet-mover"
                    />
                </Form.Item>

                <Typography.Paragraph>
                    <strong>Tariff (EUR only):</strong> dog base 3 EUR/km without crate, 3.5 EUR/km with crate; cat 2
                    EUR/km. Dogs: extra on the km subtotal by withers height — 26–50 cm +10%, 51–75 cm +15%, 76–110 cm
                    +25%. Business class ×1.25 after these surcharges.
                </Typography.Paragraph>

                {pricePreview !== null ? (
                    <>
                        <Typography.Paragraph style={{ fontSize: 18, fontWeight: 600, color: petTheme.primary }}>
                            Estimated price: {pricePreview.toFixed(2)} EUR
                        </Typography.Paragraph>
                        {dogHeightExtraPercent > 0 ? (
                            <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                                Includes +{dogHeightExtraPercent}% dog height surcharge (withers).
                            </Typography.Paragraph>
                        ) : null}
                    </>
                ) : null}

                <Space wrap>
                    <Button type="primary" onClick={() => void submit()} data-testid="city-taxi-submit">
                        Submit request
                    </Button>
                    <Button onClick={openGoogleMapsExternal} disabled={!pickup?.address || !dropoff?.address}>
                        Open in Google Maps
                    </Button>
                </Space>
            </Form>
        </div>
    );
}

/** Manual mode when no Maps API key is configured */
function CityTaxiFallbackPage (): JSX.Element {
    const [petMovers] = usePetMovers();
    const taxiMoverOptions = useMemo(
        () => petMoverSelectOptions(petMovers, 'id', (m) => m.movementType === 'taxi'),
        [petMovers]
    );
    const [form] = Form.useForm<{
        cityId: string;
        species: CityTaxiSpecies;
        taxiClass: CityTaxiClass;
        weightKg: number;
        dogHeightCm?: number;
        cage?: boolean;
        petMoverId: string;
        distanceKm: number;
    }>();

    const species = Form.useWatch('species', form) as CityTaxiSpecies | undefined;
    const taxiClass = Form.useWatch('taxiClass', form) as CityTaxiClass | undefined;
    const cageVal = Form.useWatch('cage', form);
    const dogHeightCm = Form.useWatch('dogHeightCm', form) as number | undefined;
    const distanceKm = Form.useWatch('distanceKm', form);

    const dogWithCage = species === 'dog' && cageVal === true;
    const canEstimatePrice =
        distanceKm !== undefined
        && Number.isFinite(Number(distanceKm))
        && species
        && taxiClass
        && (species !== 'dog' || (dogHeightCm !== undefined && dogHeightCm !== null));

    const pricePreview = canEstimatePrice
        ? cityTaxiTripPriceEur(
            Number(distanceKm),
            species,
            dogWithCage,
            taxiClass,
            species === 'dog' ? dogHeightCm : undefined
        )
        : null;

    const submit = useCallback(async () => {
        await form.validateFields();
        toast.success(
            pricePreview !== null
                ? `Estimate ${pricePreview.toFixed(2)} EUR — add VITE_GOOGLE_MAPS_API_KEY for map search`
                : 'Saved'
        );
    }, [form, pricePreview]);

    return (
        <div data-testid="city-taxi-page">
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Google Maps API key not set"
                description='Add VITE_GOOGLE_MAPS_API_KEY to pet-app/.env for interactive map, Places search, and automatic distance. You can still enter route length manually below.'
            />
            <Space direction="vertical" size={12} style={{ width: '100%', marginBottom: 16 }}>
                <h2 style={{ margin: 0, color: petTheme.text }}>City Pet Taxi</h2>
            </Space>
            {taxiMoverOptions.length === 0 ? (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="No taxi PetMover"
                    description='Add an active PetMover with movement type "Taxi" under PetMovers.'
                />
            ) : null}
            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    species: 'dog' as CityTaxiSpecies,
                    taxiClass: 'economy' as CityTaxiClass,
                    cage: false,
                }}
                data-testid="city-taxi-form-fallback"
            >
                <Form.Item name="cityId" label="City" rules={[{ required: true }]}>
                    <Select
                        showSearch
                        optionFilterProp="label"
                        options={MAJOR_CITIES_FR_DE_GB.map((c) => ({ value: c.id, label: `${c.label} (${c.country})` }))}
                    />
                </Form.Item>
                <Form.Item name="species" label="Pet" rules={[{ required: true }]}>
                    <Radio.Group>
                        <Radio.Button value="dog">Dog</Radio.Button>
                        <Radio.Button value="cat">Cat</Radio.Button>
                    </Radio.Group>
                </Form.Item>
                <Form.Item name="taxiClass" label="Taxi class" rules={[{ required: true }]}>
                    <Radio.Group>
                        <Radio.Button value="economy">Economy</Radio.Button>
                        <Radio.Button value="business">Business (+25%)</Radio.Button>
                    </Radio.Group>
                </Form.Item>
                <Form.Item name="weightKg" label="Pet weight (kg)" rules={[{ required: true }]}>
                    <InputNumber min={0.5} max={120} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
                {species === 'dog' ? (
                    <>
                        <Form.Item name="dogHeightCm" label="Height at withers (cm)" rules={[{ required: true }]}>
                            <Select showSearch options={DOG_WITHERS_HEIGHT_CM_OPTIONS} />
                        </Form.Item>
                        <Form.Item name="cage" label="Crate / cage" rules={[{ required: true }]}>
                            <Radio.Group>
                                <Radio value={false}>No (base 3 EUR/km)</Radio>
                                <Radio value={true}>Yes (base 3.5 EUR/km)</Radio>
                            </Radio.Group>
                        </Form.Item>
                    </>
                ) : null}
                <Form.Item name="petMoverId" label="Pet mover (taxi)" rules={[{ required: true }]}>
                    <Select showSearch optionFilterProp="label" options={taxiMoverOptions} />
                </Form.Item>
                <Form.Item name="distanceKm" label="Route distance (km)" rules={[{ required: true }]}>
                    <InputNumber min={0.1} max={500} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
                <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
                    Tariff: dog base 3 or 3.5 EUR/km (crate), height bands +10% / +15% / +25%; cat 2 EUR/km; Business
                    ×1.25.
                </Typography.Paragraph>
                {pricePreview !== null ? (
                    <Typography.Paragraph style={{ fontSize: 18, fontWeight: 600 }}>
                        Estimated price: {pricePreview.toFixed(2)} EUR
                    </Typography.Paragraph>
                ) : null}
                <Button type="primary" onClick={() => void submit()}>
                    Submit request
                </Button>
            </Form>
        </div>
    );
}

export function CityTaxiPage (): JSX.Element {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

    if (!apiKey) {
        return <CityTaxiFallbackPage />;
    }

    return <CityTaxiMapSection apiKey={apiKey} />;
}

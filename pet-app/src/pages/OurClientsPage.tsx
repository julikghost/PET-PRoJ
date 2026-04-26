import { useMemo } from 'react';
import { Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePetLogistics } from '../context/PetLogisticsContext';
import { petTheme } from '../theme/palette';

type ServiceKind = 'booking' | 'daycare' | 'both';

type OurClientRow = {
    id: string;
    clientFullName: string;
    pet: string;
    breed: string;
    service: ServiceKind;
    ordersCount: number;
};

function serviceLabel (value: ServiceKind): string {
    if (value === 'both') {
        return 'Booking + Daycare';
    }
    if (value === 'booking') {
        return 'Booking';
    }

    return 'Daycare';
}

function serviceColor (value: ServiceKind): string {
    if (value === 'both') {
        return 'purple';
    }
    if (value === 'booking') {
        return 'blue';
    }

    return 'gold';
}

export function OurClientsPage (): JSX.Element {
    const { bookings, dogDaycares } = usePetLogistics();

    const rows = useMemo<OurClientRow[]>(() => {
        const acc = new Map<string, {
            clientFullName: string;
            pets: Set<string>;
            breeds: Set<string>;
            bookingCount: number;
            daycareCount: number;
        }>();

        for (const booking of bookings) {
            const first = booking.clientFirstName.trim();
            const last = booking.clientLastName.trim();
            if (!first || !last) {
                continue;
            }
            const clientFullName = `${first} ${last}`.trim();
            const key = clientFullName.toLowerCase();
            const prev = acc.get(key);
            const nextPets = prev?.pets ?? new Set<string>();
            const nextBreeds = prev?.breeds ?? new Set<string>();
            if (booking.petLabels.length > 0) {
                nextPets.add(booking.petLabels.join(', ').trim());
            }
            acc.set(key, {
                clientFullName,
                pets: nextPets,
                breeds: nextBreeds,
                bookingCount: (prev?.bookingCount ?? 0) + 1,
                daycareCount: prev?.daycareCount ?? 0,
            });
        }

        for (const daycare of dogDaycares) {
            const first = daycare.clientFirstName.trim();
            const last = daycare.clientLastName.trim();
            if (!first || !last) {
                continue;
            }
            const clientFullName = `${first} ${last}`.trim();
            const key = clientFullName.toLowerCase();
            const prev = acc.get(key);
            const nextPets = prev?.pets ?? new Set<string>();
            const nextBreeds = prev?.breeds ?? new Set<string>();
            nextPets.add(daycare.dogName.trim() || 'Dog');
            if (daycare.breed.trim()) {
                nextBreeds.add(daycare.breed.trim());
            }
            acc.set(key, {
                clientFullName,
                pets: nextPets,
                breeds: nextBreeds,
                bookingCount: prev?.bookingCount ?? 0,
                daycareCount: (prev?.daycareCount ?? 0) + 1,
            });
        }

        return [...acc.entries()]
            .map(([id, item]) => {
                const service: ServiceKind = item.bookingCount > 0 && item.daycareCount > 0
                    ? 'both'
                    : item.bookingCount > 0
                        ? 'booking'
                        : 'daycare';
                const pet = [...item.pets].filter(Boolean).sort((a, b) => a.localeCompare(b)).join(', ') || '—';
                const breed = [...item.breeds].filter(Boolean).sort((a, b) => a.localeCompare(b)).join(', ') || '—';

                return {
                    id,
                    clientFullName: item.clientFullName,
                    pet,
                    breed,
                    service,
                    ordersCount: item.bookingCount + item.daycareCount,
                };
            })
            .sort((a, b) => (
                a.clientFullName.localeCompare(b.clientFullName)
            ));
    }, [bookings, dogDaycares]);

    const columns: ColumnsType<OurClientRow> = useMemo(
        () => [
            { title: 'Client', dataIndex: 'clientFullName', key: 'clientFullName', width: 220 },
            { title: 'Pet', dataIndex: 'pet', key: 'pet', width: 220 },
            { title: 'Breed', dataIndex: 'breed', key: 'breed', width: 180 },
            {
                title: 'Service',
                dataIndex: 'service',
                key: 'service',
                width: 180,
                render: (service: ServiceKind) => (
                    <Tag color={serviceColor(service)}>{serviceLabel(service)}</Tag>
                ),
            },
            { title: 'Orders Count', dataIndex: 'ordersCount', key: 'ordersCount', width: 120 },
        ],
        []
    );

    return (
        <div data-testid="our-clients-page">
            <Space direction="vertical" size={6} style={{ marginBottom: 16 }}>
                <h2 style={{ margin: 0, color: petTheme.text }}>Our Clients</h2>
                <p style={{ margin: 0, color: petTheme.textMuted }}>
                    Clients from Booking and Dog Daycare with aggregated order count.
                </p>
            </Space>
            <Table<OurClientRow>
                data-testid="our-clients-table"
                rowKey="id"
                columns={columns}
                dataSource={rows}
                pagination={false}
                size="middle"
                locale={{ emptyText: 'No clients yet' }}
            />
        </div>
    );
}

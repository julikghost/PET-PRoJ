import { Button, Card, Col, Row, Space, Tag } from 'antd';
import { petTheme } from '../theme/palette';

type ShowKind = 'dogs' | 'cats' | 'mixed';

type ShowLink = {
    id: string;
    title: string;
    kind: ShowKind;
    location: string;
    when: string;
    source: string;
    preview: string;
    url: string;
};

const SHOW_LINKS: ShowLink[] = [
    {
        id: 'wds-2026',
        title: 'World Dog Show 2026 (Bologna)',
        kind: 'dogs',
        location: 'Italy, Bologna',
        when: '3-7 Jun 2026',
        source: 'ENCI / WDS',
        preview: 'Official page with program, registration windows and visitor info.',
        url: 'https://wds2026.it/en/',
    },
    {
        id: 'crufts',
        title: 'Crufts (Royal Kennel Club)',
        kind: 'dogs',
        location: 'United Kingdom',
        when: 'Annual / current updates',
        source: 'Crufts',
        preview: 'The largest UK dog show: timetable, latest results and upcoming editions.',
        url: 'https://crufts.org.uk/home',
    },
    {
        id: 'fci-schedules',
        title: 'FCI International Dog Show Schedules',
        kind: 'dogs',
        location: 'Europe-wide',
        when: 'Calendar by date',
        source: 'FCI',
        preview: 'Official FCI schedule of international dog shows in European countries.',
        url: 'https://www.fci.be/en/schedules/concours.aspx?section=3',
    },
    {
        id: 'uk-championship-dogs',
        title: 'Royal Kennel Club Championship Shows',
        kind: 'dogs',
        location: 'United Kingdom',
        when: 'Seasonal dates',
        source: 'Royal Kennel Club',
        preview: 'General and group championship dog show dates and organizer details.',
        url: 'https://www.thekennelclub.org.uk/events-and-activities/dog-showing/dog-show-secretary-information/general-and-group-championship-shows/',
    },
    {
        id: 'fife-calendar',
        title: 'FIFe Cat Shows Calendar',
        kind: 'cats',
        location: 'Europe-wide',
        when: 'Monthly rolling calendar',
        source: 'FIFe',
        preview: 'Upcoming cat show list with cities, dates and event details.',
        url: 'https://fifeweb.org/events/list/',
    },
    {
        id: 'gccf-calendar',
        title: 'GCCF Show Calendar',
        kind: 'cats',
        location: 'United Kingdom',
        when: 'Current season',
        source: 'GCCF',
        preview: 'UK cat show calendar with entries and links to participating clubs.',
        url: 'https://www.gccfcats.org/show-calendar/',
    },
    {
        id: 'wcf-calendar',
        title: 'World Cat Federation Show Calendar',
        kind: 'cats',
        location: 'Europe-wide',
        when: 'Calendar by month/year',
        source: 'WCF',
        preview: 'International and world cat show listings by country and date.',
        url: 'https://www.wcf-bestcat.de/show-calendar',
    },
    {
        id: 'tica-shows',
        title: 'TICA Show Calendar',
        kind: 'cats',
        location: 'Europe and global filters',
        when: 'Current dates',
        source: 'TICA',
        preview: 'Filterable show schedule including European cat clubs and events.',
        url: 'https://shows.tica.org/en/',
    },
];

function kindLabel (kind: ShowKind): { text: string; color: string } {
    if (kind === 'dogs') {
        return { text: 'Dogs', color: 'blue' };
    }
    if (kind === 'cats') {
        return { text: 'Cats', color: 'magenta' };
    }

    return { text: 'Dogs & Cats', color: 'purple' };
}

function previewImageUrl (url: string): string {
    return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1200`;
}

export function EuropeShowsPage (): JSX.Element {
    return (
        <div data-testid="europe-shows-page">
            <Space direction="vertical" size={8} style={{ marginBottom: 18 }}>
                <h2 style={{ margin: 0, color: petTheme.text }}>Europe Pet Shows</h2>
                <p style={{ margin: 0, color: petTheme.textMuted }}>
                    Current web links to dog and cat shows in Europe with live page previews.
                </p>
            </Space>

            <Row gutter={[16, 16]}>
                {SHOW_LINKS.map((item) => {
                    const badge = kindLabel(item.kind);

                    return (
                        <Col key={item.id} xs={24} md={12} xl={8}>
                            <Card
                                hoverable
                                cover={(
                                    <div style={{ borderBottom: `1px solid ${petTheme.mutedBorder}` }}>
                                        <img
                                            src={previewImageUrl(item.url)}
                                            alt={item.title}
                                            style={{ width: '100%', height: 180, objectFit: 'cover' }}
                                            loading="lazy"
                                        />
                                    </div>
                                )}
                                bodyStyle={{ paddingTop: 12 }}
                            >
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    <Space size={8} wrap>
                                        <Tag color={badge.color}>{badge.text}</Tag>
                                        <Tag>{item.when}</Tag>
                                    </Space>
                                    <div style={{ fontWeight: 600, color: petTheme.text }}>{item.title}</div>
                                    <div style={{ color: petTheme.textMuted, fontSize: 12 }}>
                                        {item.location} - {item.source}
                                    </div>
                                    <div style={{ color: petTheme.textMuted }}>{item.preview}</div>
                                    <Button
                                        type="primary"
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        data-testid={`show-link-${item.id}`}
                                    >
                                        Open link
                                    </Button>
                                </Space>
                            </Card>
                        </Col>
                    );
                })}
            </Row>
        </div>
    );
}

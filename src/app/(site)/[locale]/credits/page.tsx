import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Eyebrow } from '@/components/Eyebrow';
import { safetyDirectory } from '@/lib/content';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'credits' });
  return { title: t('metaTitle') };
}

/**
 * Terms per asset, because they genuinely differ: KTO images arrive as KOGL type 1
 * and type 3, and two of the datasets carry no licence statement at all. A single
 * type printed site-wide would be false for most of this table, which is why the
 * footer does not print one.
 *
 * Where a manual says nothing, this table says "not stated" and the handling column
 * says what we do about it. Guessing type 1 because it is the common case would be
 * the same failure the rest of the service is built to avoid.
 */
const ASSETS = [
  {
    asset: '한국관광공사 TourAPI 관광정보 텍스트',
    license: '공공누리 제1유형 (출처 표시)',
    handling: '출처를 표기하고 원문을 그대로 보여줍니다.',
  },
  {
    asset: '한국관광공사 무장애여행 정보 (detailWithTour2)',
    license: '이용허락범위 제한 없음',
    handling: '24개 항목의 원문 문장과 원래 필드명을 화면에 그대로 노출합니다.',
  },
  {
    asset: '한국관광공사 이미지 (cpyrhtDivCd=Type1)',
    license: '공공누리 제1유형',
    handling: '출처 표기 후 리사이즈·최적화합니다.',
  },
  {
    asset: '한국관광공사 이미지 (cpyrhtDivCd=Type3)',
    license: '공공누리 제3유형 (출처 표시 + 변경 금지)',
    handling:
      '자르기·필터·합성·리사이즈를 일절 적용하지 않고 원본 그대로 서빙합니다. 이미지 최적화도 태우지 않습니다.',
  },
  {
    asset: '한국관광공사 관광사진갤러리',
    license: '매뉴얼에 라이선스 서술이 없습니다 (미확인)',
    handling:
      '공공누리 유형을 쓰지 않습니다. 촬영자를 포함한 출처를 표기하고 변형하지 않습니다.',
  },
  {
    asset: '한국관광공사 Odii 오디오·대본',
    license: '매뉴얼에 라이선스 서술이 없습니다 (미확인)',
    handling: '출처를 표기하고 원문 그대로 재생·표시합니다.',
  },
  {
    asset: '한국관광 데이터랩 지역방문자수',
    license: '공공데이터',
    handling:
      '「방문자는 관광객과 동일하게 정의되지 않습니다」 주의 문구를 숫자와 함께 항상 표시합니다.',
  },
  {
    asset: '관광지 집중률 (TatsCnctrRateService)',
    license: '공공데이터',
    handling:
      '향후 30일 예측치이므로 「예측 혼잡도(향후 30일)」로만 표기하고 현재 혼잡도라고 쓰지 않습니다.',
  },
  {
    asset: '관광지별 연관관광지 (TarRlteTarService1)',
    license: '공공데이터',
    handling:
      '별도 목록으로만 보여주고 대체 관광지에 섞지 않습니다. 연관성 기준이 공개되지 않아 접근성과 무관합니다.',
  },
  {
    asset: 'Pretendard',
    license: 'SIL Open Font License 1.1',
    handling: '이 사이트에서 직접 제공합니다. 외부 서체 서비스를 호출하지 않습니다.',
  },
] as const;

export default async function CreditsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'credits' });
  const tc = await getTranslations({ locale, namespace: 'common' });

  return (
    <article className="grid gap-8">
      <header className="grid gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1>{t('title')}</h1>
        <p className="max-w-[var(--container-prose)]">{t('intro')}</p>
      </header>

      <div className="scroll-x">
        <table className="data-table">
          <caption>{t('title')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('assetHeader.asset')}</th>
              <th scope="col">{t('assetHeader.license')}</th>
              <th scope="col">{t('assetHeader.handling')}</th>
            </tr>
          </thead>
          <tbody lang="ko">
            {ASSETS.map((row) => (
              <tr key={row.asset}>
                <th scope="row">{row.asset}</th>
                <td>{row.license}</td>
                <td>{row.handling}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="contacts-heading" className="grid gap-2">
        <h2 id="contacts-heading" className="subhead">
          {tc('emergency.title')}
        </h2>
        <ul className="grid gap-1">
          {safetyDirectory.map((contact) => (
            <li key={contact.id} className="text-[0.95rem]">
              <strong>{locale === 'ko' ? contact.labelKo : contact.labelEn}</strong>{' '}
              <span className="font-mono">{contact.tel}</span>
              <span lang="ko" className="ml-2 text-[var(--color-ink-2)]">
                {contact.sourceNote} · {contact.checkedAt}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="honesty-heading" className="card grid gap-2">
        <h2 id="honesty-heading" className="subhead">
          {tc('honesty.a11ySelfCheck')}
        </h2>
        <ul className="grid list-disc gap-1 pl-5 text-[0.95rem]">
          <li>{tc('honesty.routeEvidence')}</li>
          <li>{tc('honesty.crowd')}</li>
          <li>{tc('honesty.visitors')}</li>
          <li>{tc('honesty.related')}</li>
          <li>{tc('honesty.reportsExcluded')}</li>
          <li>{tc('honesty.handover')}</li>
        </ul>
        <p className="text-[0.9rem] text-[var(--color-ink-2)]">{t('fontNote')}</p>
      </section>
    </article>
  );
}

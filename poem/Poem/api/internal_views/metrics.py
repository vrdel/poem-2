import json

import requests
from Poem.api.internal_views.utils import one_value_inline, two_value_inline, \
    inline_metric_for_db
from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_history
from Poem.helpers.metrics_helpers import import_metrics, \
    update_metric_in_schema, get_metrics_in_profiles, \
    delete_metrics_from_profile
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import error_response


class ListAllMetrics(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        metrics = poem_models.Metric.objects.all().order_by('name')

        results = []
        for metric in metrics:
            results.append({'name': metric.name})

        return Response(results)


class ListPublicAllMetrics(ListAllMetrics):
    authentication_classes = ()
    permission_classes = ()


class ListMetric(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            metrics = poem_models.Metric.objects.filter(name=name)
            if metrics.count() == 0:
                raise NotFound(status=404,
                               detail='Metric not found')
        else:
            metrics = poem_models.Metric.objects.all()

        results = []
        for metric in metrics:
            config = two_value_inline(metric.config)
            parent = one_value_inline(metric.parent)
            probeexecutable = one_value_inline(metric.probeexecutable)
            attribute = two_value_inline(metric.attribute)
            dependancy = two_value_inline(metric.dependancy)
            flags = two_value_inline(metric.flags)
            files = two_value_inline(metric.files)
            parameter = two_value_inline(metric.parameter)
            fileparameter = two_value_inline(metric.fileparameter)

            if metric.probekey:
                probeversion = metric.probekey.__str__()
            else:
                probeversion = ''

            if metric.group:
                group = metric.group.name
            else:
                group = ''

            results.append(dict(
                id=metric.id,
                name=metric.name,
                mtype=metric.mtype.name,
                tags=[tag.name for tag in metric.tags.all()],
                probeversion=probeversion,
                group=group,
                description=metric.description,
                parent=parent,
                probeexecutable=probeexecutable,
                config=config,
                attribute=attribute,
                dependancy=dependancy,
                flags=flags,
                files=files,
                parameter=parameter,
                fileparameter=fileparameter
            ))

        results = sorted(results, key=lambda k: k['name'])

        if name:
            return Response(results[0])
        else:
            return Response(results)

    def put(self, request):
        try:
            userprofile = poem_models.UserProfile.objects.get(user=request.user)

            metric = poem_models.Metric.objects.get(name=request.data['name'])
            init_group = metric.group

            if not request.user.is_superuser and \
                    userprofile.groupsofmetrics.all().count() == 0:
                return error_response(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='You do not have permission to change metrics.'
                )

            if not request.user.is_superuser and \
                    init_group not in userprofile.groupsofmetrics.all():
                return error_response(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='You do not have permission to change metrics '
                           'in this group.'
                )

            else:
                if request.data['parent']:
                    parent = json.dumps([request.data['parent']])
                else:
                    parent = ''

                if request.data['probeexecutable']:
                    probeexecutable = json.dumps(
                        [request.data['probeexecutable']]
                    )
                else:
                    probeexecutable = ''

                if request.data['description']:
                    description = request.data['description']
                else:
                    description = ''

                metric_group = poem_models.GroupOfMetrics.objects.get(
                    name=request.data['group']
                )

                metric_type = poem_models.MetricType.objects.get(
                    name=request.data['mtype']
                )

                user_perm = request.user.is_superuser or \
                    metric_group in userprofile.groupsofmetrics.all()

                if user_perm:
                    metric.name = request.data['name']
                    metric.mtype = metric_type
                    metric.group = poem_models.GroupOfMetrics.objects.get(
                        name=request.data['group']
                    )
                    metric.description = description
                    metric.parent = parent
                    metric.flags = inline_metric_for_db(request.data['flags'])

                    if request.data['mtype'] == 'Active':
                        metric.probekey = admin_models.ProbeHistory.objects.get(
                            name=request.data['probeversion'].split(' ')[0],
                            package__version=request.data[
                                                 'probeversion'
                                             ].split(' ')[1][1:-1]
                        )
                        metric.probeexecutable = probeexecutable
                        metric.config = inline_metric_for_db(
                            request.data['config']
                        )
                        metric.attribute = inline_metric_for_db(
                            request.data['attribute'])
                        metric.dependancy = inline_metric_for_db(
                            request.data['dependancy'])
                        metric.files = inline_metric_for_db(
                            request.data['files']
                        )
                        metric.parameter = inline_metric_for_db(
                            request.data['parameter'])
                        metric.fileparameter = inline_metric_for_db(
                            request.data['fileparameter']
                        )

                    metric.save()
                    create_history(metric, request.user.username)

                    return Response(status=status.HTTP_201_CREATED)

                else:
                    return error_response(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail='You do not have permission to assign metrics '
                               'to the given group.'
                    )

        except poem_models.UserProfile.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='No user profile for authenticated user.'
            )

        except poem_models.Metric.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Metric does not exist.'
            )

        except poem_models.GroupOfMetrics.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Group of metrics does not exist.'
            )

        except poem_models.MetricType.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Metric type does not exist.'
            )

        except KeyError as e:
            return error_response(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Missing data key: {}'.format(e.args[0])
            )

    def delete(self, request, name=None):
        if name:
            try:
                userprofile = poem_models.UserProfile.objects.get(
                    user=request.user
                )

                if not request.user.is_superuser and \
                        userprofile.groupsofmetrics.all().count() == 0:
                    return error_response(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail='You do not have permission to delete metrics.'
                    )

                else:
                    metric = poem_models.Metric.objects.get(name=name)

                    if request.user.is_superuser or \
                            metric.group in userprofile.groupsofmetrics.all():
                        poem_models.TenantHistory.objects.filter(
                            object_id=metric.id,
                            content_type=ContentType.objects.get_for_model(
                                poem_models.Metric
                            )
                        ).delete()
                        metric.delete()
                        return Response(status=status.HTTP_204_NO_CONTENT)

                    else:
                        return error_response(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='You do not have permission to delete '
                                   'metrics in this group.'
                        )

            except poem_models.UserProfile.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='No user profile for authenticated user.'
                )

            except poem_models.Metric.DoesNotExist:
                raise NotFound(status=404, detail='Metric not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class ListPublicMetric(ListMetric):
    authentication_classes = ()
    permission_classes = ()

    def _denied(self):
        return Response(status=status.HTTP_403_FORBIDDEN)

    def post(self, request):
        return self._denied()

    def put(self, request):
        return self._denied()

    def delete(self, request, name):
        return self._denied()


class ListMetricTypes(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        types = poem_models.MetricType.objects.all().values_list(
            'name', flat=True
        )
        return Response(types)


class ListPublicMetricTypes(ListMetricTypes):
    authentication_classes = ()
    permission_classes = ()


class ImportMetrics(APIView):
    authentication_classes = (SessionAuthentication,)

    def post(self, request):
        if request.user.is_superuser:
            imported, warn, err, unavailable = import_metrics(
                metrictemplates=dict(request.data)['metrictemplates'],
                tenant=request.tenant, user=request.user
            )

            message_bit = ''
            warn_bit = ''
            error_bit = ''
            error_bit2 = ''
            unavailable_bit = ''
            if imported:
                if len(imported) == 1:
                    message_bit = '{} has'.format(imported[0])
                else:
                    message_bit = ', '.join(msg for msg in imported) + ' have'

            if warn:
                if len(warn) == 1:
                    warn_bit = \
                        '{} has been imported with older probe version. ' \
                        'If you wish to use more recent probe version, ' \
                        'you should update package version you use.'.format(
                            warn[0]
                        )

                else:
                    warn_bit = \
                        "{} have been imported with older probes' " \
                        "versions. If you wish to use more recent " \
                        "versions of probes, you should update packages' " \
                        "versions you use.".format(
                            ', '.join(msg for msg in warn)
                        )

            if err:
                if len(err) == 1:
                    error_bit = '{} has'.format(err[0])
                    error_bit2 = 'it already exists'
                else:
                    error_bit = ', '.join(msg for msg in err) + ' have'
                    error_bit2 = 'they already exist'

            if unavailable:
                if len(unavailable) == 1:
                    unavailable_bit = \
                        '{} has not been imported, since it is not ' \
                        'available for the package version you ' \
                        'use. If you wish to use the metric, you ' \
                        'should change the package version, and try' \
                        ' to import again.'.format(unavailable[0])
                else:
                    unavailable_bit = \
                        "{} have not been imported, since they are " \
                        "not available for the packages' versions " \
                        "you use. If you wish to use the metrics, " \
                        "you should change the packages' versions, " \
                        "and try to import again.".format(
                            ', '.join(ua for ua in unavailable)
                        )

            data = dict()
            if message_bit:
                data.update({
                    'imported':
                        '{} been successfully imported.'.format(message_bit)
                })

            if warn_bit:
                data.update({
                    'warn': warn_bit
                })

            if error_bit:
                data.update({
                    'err':
                        '{} not been imported since {} in the database.'.format(
                            error_bit, error_bit2
                        )
                })

            if unavailable_bit:
                data.update({
                    'unavailable': unavailable_bit
                })

            return Response(status=status.HTTP_200_OK, data=data)

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to import metrics.'
            )


class UpdateMetricsVersions(APIView):
    """
    We allow tenant users to pick package version they wish to install, and
    update metrics accordingly.
    """
    authentication_classes = (SessionAuthentication,)

    def _handle_metrics(
            self, name, version, user, schema, dry_run=False, metrics=None
    ):
        try:
            package = admin_models.Package.objects.get(
                name=name, version=version
            )

            # warning for metrics if there is no metric template history for
            # metric templates of that name
            warning_no_tbh = []
            # metrics deleted because they are not available in the given
            # package
            deleted_not_in_package = []
            # updated metrics
            updated = []
            profile_warning = []
            for metric in poem_models.Metric.objects.all():
                if metric.probekey and \
                        metric.probekey.package.name == package.name:
                    mts_history = \
                        admin_models.MetricTemplateHistory.objects.filter(
                            name=metric.name
                        )
                    if len(mts_history) > 0:
                        mts = admin_models.MetricTemplateHistory.objects.filter(
                            object_id=mts_history[0].object_id
                        )
                        metrictemplate = None
                        for mt in mts:
                            if mt.probekey.package == package:
                                metrictemplate = mt
                                break

                        if metrictemplate:
                            if not dry_run:
                                update_metric_in_schema(
                                    mt_id=metrictemplate.id,
                                    name=metric.name,
                                    pk_id=metric.probekey.id,
                                    schema=schema,
                                    update_from_history=True,
                                    user=user
                                )
                            updated.append(metric.name)

                        else:
                            if dry_run:
                                for key, value in metrics.items():
                                    if metric.name == key:
                                        if len(value) == 1:
                                            profile_warning.append(
                                                'Metric {} is part of {} '
                                                'metric profile.'.format(
                                                    metric.name, value[0]
                                                )
                                            )

                                        else:
                                            profile_warning.append(
                                                'Metric {} is part of {} '
                                                'metric profiles.'.format(
                                                    metric.name, ', '.join(
                                                        value
                                                    )
                                                )
                                            )

                            else:
                                metric.delete()

                            deleted_not_in_package.append(metric.name)

                    else:
                        warning_no_tbh.append(metric.name)

            msg = dict()
            if deleted_not_in_package:
                if len(deleted_not_in_package) == 1:
                    subj = 'Metric {}'.format(deleted_not_in_package[0])
                    verb = 'has'
                    obj = 'its probe is'
                else:
                    subj = 'Metrics {}'.format(
                        ', '.join(deleted_not_in_package)
                    )
                    verb = 'have'
                    obj = 'their probes are'

                if dry_run:
                    delete_msg = '{} will be deleted, since {} not part of ' \
                                 'the chosen package.'.format(subj, obj)

                    if profile_warning:
                        if len(profile_warning) == 1:
                            delete_msg += \
                                ' WARNING: {} ARE YOU SURE YOU WANT TO ' \
                                'DELETE IT?'.format(
                                    profile_warning[0]
                                )

                        else:
                            delete_msg += \
                                ' {} ARE YOU SURE YOU WANT TO ' \
                                'DELETE THEM?'.format(
                                    ' '.join(profile_warning)
                                )

                else:
                    delete_msg = '{} {} been deleted, since {} not part of ' \
                                 'the chosen package.'.format(subj, verb, obj)

                msg.update({'deleted': delete_msg})

            if warning_no_tbh:
                if len(warning_no_tbh) == 1:
                    subj = 'instance of {} has'.format(warning_no_tbh[0])

                else:
                    subj = 'instances of {} have'.format(
                        ', '.join(warning_no_tbh)
                    )

                msg.update(
                    {
                        'warning': 'Metric template history {} not been found. '
                                   'Please contact Administrator.'.format(subj)
                    }
                )

            if updated:
                if len(updated) == 1:
                    if dry_run:
                        subj = 'Metric {} will be'.format(updated[0])

                    else:
                        subj = 'Metric {} has been successfully'.format(
                            updated[0]
                        )

                else:
                    if dry_run:
                        subj = 'Metrics {} will be'.format(', '.join(updated))

                    else:
                        subj = 'Metrics {} have been successfully'.format(
                            ', '.join(updated)
                        )

                msg.update({'updated': '{} updated.'.format(subj)})

            if dry_run:
                return msg, status.HTTP_200_OK

            else:
                return msg, status.HTTP_201_CREATED, deleted_not_in_package

        except admin_models.Package.DoesNotExist:
            msg = {'detail': 'Package not found.'}
            if dry_run:
                return msg, status.HTTP_404_NOT_FOUND

            else:
                return msg, status.HTTP_404_NOT_FOUND, []

    def get(self, request, pkg):
        version = pkg.split('-')[-1]
        name = pkg.split(version)[0][0:-1]

        try:
            metrics_in_profiles = get_metrics_in_profiles(
                request.tenant.schema_name
            )

        except requests.exceptions.HTTPError as e:
            try:
                json_msg = e.response.json()
                msg = 'Error fetching WEB API data: {} {}: {}'.format(
                    e.response.status_code, e.response.reason,
                    json_msg['status']['details']
                )

            except json.decoder.JSONDecodeError:
                msg = 'Error fetching WEB API data: {} {}'.format(
                    e.response.status_code, e.response.reason
                )

            return Response({'detail': msg}, status=e.response.status_code)

        except Exception as e:
            msg = str(e)
            return Response({'detail': msg}, status=status.HTTP_404_NOT_FOUND)

        msg, status_code = self._handle_metrics(
            name=name, version=version, user=request.user.username,
            schema=request.tenant.schema_name, dry_run=True,
            metrics=metrics_in_profiles
        )

        return Response(msg, status=status_code)

    def put(self, request):
        if request.user.is_superuser:
            msg, status_code, deleted = self._handle_metrics(
                name=request.data['name'], version=request.data['version'],
                schema=request.tenant.schema_name, user=request.user.username
            )

            warn_msg = []
            if deleted:
                try:
                    metrics_in_profiles = get_metrics_in_profiles(
                        request.tenant.schema_name
                    )

                except Exception:
                    warn_msg.append(
                        'Unable to get data on metrics and metric profiles. '
                        'Please remove deleted metrics from metric profiles '
                        'manually.'
                    )

                else:
                    profiles = dict()
                    for metric in deleted:
                        for key, value in metrics_in_profiles.items():
                            if key == metric:
                                for p in value:
                                    if p in profiles:
                                        profiles.update(
                                            {p: profiles[p] + [key]}
                                        )
                                    else:
                                        profiles.update({p: [key]})

                    if profiles:
                        for key, value in profiles.items():
                            try:
                                delete_metrics_from_profile(key, value)

                            except Exception:
                                if len(value) > 1:
                                    message = \
                                        'Error trying to remove metrics {} ' \
                                        'from profile {}.'.format(
                                            ', '.join(value), key
                                        )
                                    pronoun = 'them'
                                else:
                                    message = \
                                        'Error trying to remove metric {} ' \
                                        'from profile {}.'.format(value[0], key)
                                    pronoun = 'it'

                                warn_msg.append(
                                    message +
                                    ' Please remove {} manually.'.format(
                                        pronoun
                                    )
                                )
                                continue

            if warn_msg:
                msg['deleted'] += ' WARNING: ' + ' '.join(warn_msg)

            return Response(msg, status=status_code)

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="You do not have permission to update metrics' versions."
            )
